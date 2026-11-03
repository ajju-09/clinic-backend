"use strict";

const bcrypt = require("bcrypt");
const { randomInt } = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const AppError = require("../utils/AppError");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const emailService = require("./email.services");
const { USER_ROLES, USER_STATUS } = require("../helper/constant");

const JWT_SECRET = process.env.JWT_SECRET || "clinic_jwt_super_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRE_TIME || "7d";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// OTP TTL in seconds (default 10 min = 600s)
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS, 10) || 600;
// Max OTP verification attempts
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;

const { blacklistToken } = require("../config/redis");
const { generateUniqueMdCode } = require("../helper/commonFunctions");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Record an admin audit log entry (never throws – errors are swallowed)
 */
const recordAuditLog = async ({
  action,
  entity,
  entity_id = null,
  user_id = null,
  ip = null,
  user_agent = null,
  details = null,
}) => {
  try {
    await db.AuditLog.create({
      action,
      entity,
      entity_id: entity_id ? String(entity_id) : null,
      user_id: user_id || null,
      ip: ip || null,
      user_agent: user_agent || null,
      details: details || null,
    });
  } catch (err) {
    console.error("[AuditLog Error] Failed to write audit log:", err.message);
  }
};

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
const generateOtp = () => randomInt(100000, 1000000).toString();

/**
 * Compute OTP expiry timestamp (now + OTP_TTL_SECONDS)
 */
const otpExpiresAt = () => new Date(Date.now() + OTP_TTL_SECONDS * 1000);

const capitalizeNameInitial = (name) => {
  const trimmedName = name.trim();
  return trimmedName
    ? `${trimmedName[0].toUpperCase()}${trimmedName.slice(1)}`
    : trimmedName;
};

// ─── 1. Check Username Availability ──────────────────────────────────────────

const checkUsernameService = async (username) => {
  const normalized = username.trim().toLowerCase();

  if (normalized.length < 3 || normalized.length > 30) {
    throw AppError.badRequest("Username must be between 3 and 30 characters");
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw AppError.badRequest(
      "Username may only contain letters, numbers and underscores",
    );
  }

  const existing = await db.User.findOne({ where: { username: normalized } });

  return {
    success: true,
    available: !existing,
    username: normalized,
    message: existing ? "Username is already taken" : "Username is available",
  };
};

// ─── 2. Initiate Registration – save pending user ────────────────────────────

const initiateRegistrationService = async (
  { first_name, last_name, username, email, password },
  meta = {},
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedFirstName = capitalizeNameInitial(first_name);
  const normalizedLastName = capitalizeNameInitial(last_name);

  // Block duplicate active+verified accounts
  const existingActive = await db.User.findOne({
    where: {
      email: normalizedEmail,
      is_verified: true,
      status: USER_STATUS.ACTIVE,
    },
  });
  if (existingActive) {
    throw AppError.conflict(
      "An active account already exists for this email address",
    );
  }

  // Reuse a pending registration for this email when the form is resubmitted.
  const pendingUser = await db.User.scope("withOtp").findOne({
    where: { email: normalizedEmail },
  });

  // Block duplicate username (across all users)
  const existingUsername = await db.User.findOne({
    where: { username: normalizedUsername },
  });
  if (
    existingUsername &&
    String(existingUsername.id) !== String(pendingUser?.id)
  ) {
    throw AppError.conflict(
      "Username is already taken. Please choose another one",
    );
  }

  // Hash password up-front (stored while pending)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert: if a previous pending record exists for this email, overwrite it
  let user = pendingUser;

  if (user) {
    // Overwrite previous pending record
    user.first_name = normalizedFirstName;
    user.last_name = normalizedLastName;
    user.username = normalizedUsername;
    user.password = hashedPassword;
    user.role = USER_ROLES.MD;
    user.status = USER_STATUS.PENDING;
    user.is_verified = false;
    user.otp = null;
    user.otp_attempt = 0;
    user.otp_expires_at = null;
    await user.save();
  } else {
    user = await db.User.create({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: USER_ROLES.MD,
      status: USER_STATUS.PENDING,
      is_verified: false,
      otp: null,
      otp_attempt: 0,
      otp_expires_at: null,
    });
  }

  await recordAuditLog({
    action: "USER_REGISTRATION_INITIATED",
    entity: "User",
    entity_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { email: normalizedEmail },
  });

  return {
    success: true,
    message: "Registration details saved. A verification code will be sent separately.",
    email: normalizedEmail,
  };
};

// ─── 2a. Send or resend OTP for a pending registration ────────────────────────

const sendRegistrationOtpService = async (email, meta = {}) => {
  if (!email || typeof email !== "string") {
    throw AppError.badRequest("Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.User.scope("withOtp").findOne({
    where: {
      email: normalizedEmail,
      status: USER_STATUS.PENDING,
      is_verified: false,
    },
  });

  if (!user) {
    throw AppError.notFound(
      "No pending registration found for this email. Please register first.",
    );
  }

  const otp = generateOtp();
  const expires = otpExpiresAt();
  user.otp = otp;
  user.otp_attempt = 0;
  user.otp_expires_at = expires;
  await user.save();

  const delivery = await emailService.sendOtpEmail(
    normalizedEmail,
    otp,
    Math.round(OTP_TTL_SECONDS / 60),
  );
  if (!delivery?.success) {
    user.otp = null;
    user.otp_expires_at = null;
    await user.save();
    throw new AppError(
      "Could not send the verification email. Please try again.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }

  await recordAuditLog({
    action: "USER_REGISTRATION_OTP_SENT",
    entity: "User",
    entity_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { email: normalizedEmail, ttl: OTP_TTL_SECONDS },
  });

  return {
    success: true,
    message: `A 6-digit verification code has been sent to ${normalizedEmail}. It is valid for ${Math.round(OTP_TTL_SECONDS / 60)} minutes.`,
    email: normalizedEmail,
  };
};

// ─── 3. Verify Registration OTP → activate account + issue JWT ───────────────

const verifyRegistrationOtpService = async ({ email, otp }, meta = {}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  // Find pending unverified user (include OTP field via scope)
  const user = await db.User.scope("withOtp").findOne({
    where: {
      email: normalizedEmail,
      status: USER_STATUS.PENDING,
      is_verified: false,
    },
  });

  if (!user) {
    throw AppError.badRequest(
      "No pending registration found for this email. Please register again",
    );
  }

  // Check OTP expiry
  if (!user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
    throw AppError.badRequest(
      "The verification code has expired. Please request a new code",
    );
  }

  // Check attempt limit
  if (user.otp_attempt >= OTP_MAX_ATTEMPTS) {
    throw AppError.tooManyRequests(
      "Maximum verification attempts exceeded. Please register again",
    );
  }

  // Compare OTP
  if (user.otp !== trimmedOtp) {
    user.otp_attempt = (user.otp_attempt || 0) + 1;
    await user.save();
    if (user.otp_attempt >= OTP_MAX_ATTEMPTS) {
      throw AppError.tooManyRequests(
        "Maximum verification attempts exceeded. Please request a new code",
      );
    }
    const remaining = OTP_MAX_ATTEMPTS - user.otp_attempt;
    throw AppError.badRequest(
      `Invalid verification code. ${remaining} attempt(s) remaining`,
    );
  }

  // OTP is valid – activate account
  user.is_verified = true;
  user.otp_verified_at = new Date();
  user.email_verified_at = new Date();
  user.status = USER_STATUS.ACTIVE;
  user.otp = null;
  user.otp_attempt = 0;
  user.otp_expires_at = null;
  user.is_login = true;
  user.last_login_at = new Date();
  await user.save();

  // Create initial DoctorProfile with unique MD code
  let doctorProfile = await db.DoctorProfile.findOne({
    where: { user_id: user.id },
  });
  if (!doctorProfile) {
    const mdCode = await generateUniqueMdCode();
    doctorProfile = await db.DoctorProfile.create({
      user_id: user.id,
      md_code: mdCode,
      profile_completion_status: "incomplete",
      is_active: true,
    });
  }

  // Issue full session JWT
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  const sanitizedUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    is_verified: user.is_verified,
    isProfileComplete: false,
    doctorProfile: doctorProfile || null,
  };

  await recordAuditLog({
    action: "USER_REGISTERED",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { username: user.username, role: user.role },
  });

  return {
    success: true,
    message: "Email verified successfully. Welcome to MediPulse OS!",
    token,
    user: sanitizedUser,
    isProfileComplete: false,
  };
};

// ─── 4. User Login ────────────────────────────────────────────────────────────

const loginUserService = async ({ identifier, password, role }, meta = {}) => {
  const cleanIdentifier = identifier.trim().toLowerCase();

  const user = await db.User.scope("withPassword").findOne({
    where: {
      [Op.or]: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
      role
    },
    include: [
      {
        model: db.DoctorProfile,
        as: "doctorProfile",
      },
    ],
  });

  if (!user || !user.password) {
    throw AppError.unauthorized("Invalid credentials");
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden(
      "Your account has been suspended. Please contact support",
    );
  }

  if (!user.is_verified) {
    throw AppError.forbidden(
      "Your email is not verified. Please complete the registration process",
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw AppError.unauthorized("Invalid credentials");
  }

  // Update login timestamp
  user.last_login_at = new Date();
  user.is_login = true;
  await user.save();

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  const isProfileComplete =
    user.doctorProfile?.profile_completion_status === "completed";

  const sanitizedUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    is_verified: user.is_verified,
    isProfileComplete,
    doctorProfile: user.doctorProfile || null,
  };

  await recordAuditLog({
    action: "USER_LOGIN",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
  });

  return {
    success: true,
    message: "Login successful",
    token,
    user: sanitizedUser,
    isProfileComplete,
  };
};

// ─── 5. Complete Doctor Profile ───────────────────────────────────────────────

const uploadDoctorProfileImage = (file, userId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `medipulse/doctors/${userId}/profile`,
        public_id: `profile-${Date.now()}`,
        resource_type: "image",
        type: "upload",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.public_id || !result?.secure_url) {
          return reject(new Error("Cloudinary returned an invalid profile image response."));
        }
        resolve(result);
      },
    );
    stream.end(file.buffer);
  });

const completeDoctorProfileService = async (
  userId,
  profileData,
  meta = {},
  profileImage = null,
) => {
  let profile = await db.DoctorProfile.findOne({
    where: { user_id: userId },
  });

  let uploadedImage = null;
  if (profileImage) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        "Cloudinary media storage is not configured.",
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
      );
    }
    try {
      uploadedImage = await uploadDoctorProfileImage(profileImage, userId);
    } catch (error) {
      console.error("Unable to upload the doctor profile image to Cloudinary.", error);
      throw new AppError(
        "Unable to upload the doctor profile image.",
        502,
        "PROFILE_IMAGE_UPLOAD_FAILED",
      );
    }
  }

  const updateFields = {
    medical_registration_no: profileData.medical_registration_no,
    phone: profileData.phone,
    gender: profileData.gender || null,
    bio: profileData.bio || null,
    experience_years: profileData.experience_years ?? null,
    specialization: profileData.specialization,
    qualification: profileData.qualification,
    profile_completion_status: "completed",
    ...(uploadedImage && {
      profile_image_url: uploadedImage.secure_url,
      profile_image_public_id: uploadedImage.public_id,
    }),
  };

  const previousImagePublicId = profile?.profile_image_public_id;
  try {
    if (!profile) {
      profile = await db.DoctorProfile.create({
        user_id: userId,
        md_code: await generateUniqueMdCode(),
        ...updateFields,
      });
    } else {
      await profile.update(updateFields);
    }
  } catch (error) {
    if (uploadedImage) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, {
          resource_type: "image",
          type: "upload",
          invalidate: true,
        });
      } catch (cleanupError) {
        console.error("Unable to clean up an unlinked doctor profile image.", cleanupError);
      }
    }
    throw error;
  }

  if (
    uploadedImage &&
    previousImagePublicId &&
    previousImagePublicId !== uploadedImage.public_id
  ) {
    try {
      await cloudinary.uploader.destroy(previousImagePublicId, {
        resource_type: "image",
        type: "upload",
        invalidate: true,
      });
    } catch (cleanupError) {
      console.error("Unable to clean up the previous doctor profile image.", cleanupError);
    }
  }

  await recordAuditLog({
    action: "DOCTOR_PROFILE_COMPLETED",
    entity: "DoctorProfile",
    entity_id: profile.id,
    user_id: userId,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: {
      profileCompletionStatus: profile.profile_completion_status,
    },
  });

  return {
    success: true,
    message: "Doctor profile completed successfully",
    isProfileComplete: true,
    profile,
  };
};

// ─── 6. Get Current User Profile ─────────────────────────────────────────────

const getUserProfileService = async (userId) => {
  const user = await db.User.findByPk(userId, {
    include: [
      {
        model: db.DoctorProfile,
        as: "doctorProfile",
      },
    ],
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  const isProfileComplete =
    user.doctorProfile?.profile_completion_status === "completed";

  const mustChangePassword = Boolean(
    !user.password_change_at && user.credentials_email_status === "sent",
  );

  const sanitizedUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    is_verified: user.is_verified,
    is_login: user.is_login,
    last_login_at: user.last_login_at,
    password_change_at: user.password_change_at,
    mustChangePassword,
    isProfileComplete,
    doctorProfile: user.doctorProfile || null,
  };

  return {
    success: true,
    user: sanitizedUser,
    data: {
      user: sanitizedUser,
    },
    isProfileComplete,
  };
};

// ─── 7. Change Password (Authenticated) ──────────────────────────────────────

const changePasswordService = async (
  userId,
  { currentPassword, oldPassword, newPassword },
  meta = {},
) => {
  const pwdToCheck = currentPassword || oldPassword;
  if (!pwdToCheck) {
    throw AppError.badRequest("Current password is required");
  }

  const user = await db.User.scope("withPassword").findByPk(userId, {
    include: [
      {
        model: db.DoctorProfile,
        as: "doctorProfile",
      },
    ],
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden("Your account has been suspended");
  }

  if (!user.password) {
    throw AppError.badRequest(
      "Your account has no existing password set. Please use reset password.",
    );
  }

  const isCurrentValid = await bcrypt.compare(pwdToCheck, user.password);
  if (!isCurrentValid) {
    throw AppError.unauthorized("Incorrect current password");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw AppError.badRequest(
      "New password cannot be the same as your current password",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.password_change_at = new Date();
  await user.save();

  // Issue fresh token for active session
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  const isProfileComplete =
    user.doctorProfile?.profile_completion_status === "completed";

  const sanitizedUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    is_verified: user.is_verified,
    is_login: user.is_login,
    mustChangePassword: false,
    last_login_at: user.last_login_at,
    password_change_at: user.password_change_at,
    isProfileComplete,
    doctorProfile: user.doctorProfile || null,
  };

  await recordAuditLog({
    action: "USER_PASSWORD_CHANGED",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
  });

  return {
    success: true,
    message: "Password changed successfully",
    token,
    accessToken: token,
    user: sanitizedUser,
    data: {
      token,
      accessToken: token,
      user: sanitizedUser,
    },
  };
};

// ─── 8. Forgot Password – send OTP to email ───────────────────────────────────

const forgotPasswordService = async (email, meta = {}) => {
  if (!email || typeof email !== "string") {
    throw AppError.badRequest("Registered email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.User.findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Return generic success to avoid email enumeration
    return {
      success: true,
      message:
        "If an account with that email exists, a reset code has been sent",
    };
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden("Your account has been suspended");
  }

  const otp = generateOtp();
  const expires = otpExpiresAt();

  user.otp = otp;
  user.otp_attempt = 0;
  user.otp_expires_at = expires;
  await user.save();

  // Send OTP via email
  if (IS_PRODUCTION) {
    await emailService.sendPasswordResetOtpEmail(normalizedEmail, otp);
  } else {
    console.log(
      `[DEV OTP – Forgot Password] Email: ${normalizedEmail} | OTP: ${otp} | Expires: ${expires.toISOString()}`,
    );
  }

  await recordAuditLog({
    action: "USER_PASSWORD_RESET_OTP_SENT",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { email: normalizedEmail },
  });

  return {
    success: true,
    message: `A 6-digit reset code has been sent to ${normalizedEmail}. It is valid for ${Math.round(OTP_TTL_SECONDS / 60)} minutes.`,
    email: normalizedEmail,
    ...(!IS_PRODUCTION ? { otp } : {}),
  };
};

// ─── 9. Verify Forgot Password OTP → issue short-lived reset token ────────────

const verifyForgotPasswordOtpService = async ({ email, otp }, meta = {}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  const user = await db.User.scope("withOtp").findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw AppError.notFound("No account found with this email address");
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden("Your account has been suspended");
  }

  // Check OTP expiry
  if (!user.otp || !user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
    throw AppError.badRequest(
      "The reset code has expired or does not exist. Please request a new one",
    );
  }

  // Check attempt limit
  if (user.otp_attempt >= OTP_MAX_ATTEMPTS) {
    throw AppError.tooManyRequests(
      "Maximum OTP attempts exceeded. Please request a new reset code",
    );
  }

  // Compare OTP
  if (user.otp !== trimmedOtp) {
    user.otp_attempt = (user.otp_attempt || 0) + 1;
    await user.save();
    if (user.otp_attempt >= OTP_MAX_ATTEMPTS) {
      throw AppError.tooManyRequests(
        "Maximum OTP attempts exceeded. Please request a new reset code",
      );
    }
    const remaining = OTP_MAX_ATTEMPTS - user.otp_attempt;
    throw AppError.badRequest(
      `Invalid reset code. ${remaining} attempt(s) remaining`,
    );
  }

  // OTP is valid – clear OTP fields and issue short-lived reset token
  user.otp = null;
  user.otp_attempt = 0;
  user.otp_expires_at = null;
  await user.save();

  // Short-lived JWT for the reset-password step only (15 min)
  const resetToken = jwt.sign(
    { id: user.id, email: user.email, type: "password_reset" },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  await recordAuditLog({
    action: "USER_PASSWORD_RESET_OTP_VERIFIED",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { email: normalizedEmail },
  });

  return {
    success: true,
    message: "OTP verified. You may now reset your password.",
    resetToken,
  };
};

// ─── 10. Reset Password ───────────────────────────────────────────────────────

const resetPasswordService = async (
  { token, newPassword, confirmPassword },
  meta = {},
) => {
  if (!token) {
    throw AppError.badRequest("Reset token is required");
  }

  if (!newPassword) {
    throw AppError.badRequest("New password is required");
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    throw AppError.badRequest("Passwords do not match");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw AppError.badRequest(
        "The password reset session has expired. Please start the forgot password process again",
      );
    }
    throw AppError.badRequest("Invalid or malformed reset token");
  }

  if (decoded.type !== "password_reset") {
    throw AppError.badRequest("Invalid reset token type");
  }

  const user = await db.User.scope("withPassword").findByPk(decoded.id);
  if (!user) {
    throw AppError.notFound("User account no longer exists");
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden("Your account has been suspended");
  }

  if (user.password) {
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      throw AppError.badRequest(
        "New password cannot be the same as your current password",
      );
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.password_change_at = new Date();
  await user.save();

  await recordAuditLog({
    action: "USER_PASSWORD_RESET_COMPLETED",
    entity: "User",
    entity_id: user.id,
    user_id: user.id,
    ip: meta.ip,
    user_agent: meta.userAgent,
    details: { email: user.email },
  });

  return {
    success: true,
    message:
      "Password has been reset successfully. You can now log in with your new password",
  };
};

// ─── 11. Logout ───────────────────────────────────────────────────────────────

const logoutService = async (userId, token = null, meta = {}) => {
  const user = await db.User.findByPk(userId);
  if (user) {
    user.is_login = false;
    await user.save();
  }

  // Blacklist token in Redis until its expiration
  if (token) {
    let ttlSeconds = 86400; // default 24h fallback
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const remaining = Math.floor(decoded.exp - Date.now() / 1000);
        ttlSeconds = remaining > 0 ? remaining : 60;
      }
    } catch {
      ttlSeconds = 3600;
    }
    await blacklistToken(token, ttlSeconds);
  }

  await recordAuditLog({
    action: "USER_LOGOUT",
    entity: "User",
    entity_id: userId,
    user_id: userId,
    ip: meta.ip,
    user_agent: meta.userAgent,
  });

  return {
    success: true,
    message: "Logged out successfully",
  };
};

// ─── 12. Admin: Get Audit Logs ────────────────────────────────────────────────

const getAuditLogsService = async ({
  limit = 50,
  offset = 0,
  action = null,
}) => {
  const where = {};
  if (action) where.action = action;

  const { rows, count } = await db.AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "email", "role"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
  });

  return {
    success: true,
    total: count,
    auditLogs: rows,
  };
};

// ─── 13. Helper: Find User By ID ─────────────────────────────────────────────

const findUserById = async (id) => {
  return await db.User.findByPk(id);
};

module.exports = {
  checkUsernameService,
  initiateRegistrationService,
  sendRegistrationOtpService,
  verifyRegistrationOtpService,
  loginUserService,
  completeDoctorProfileService,
  getUserProfileService,
  getAuditLogsService,
  findUserById,
  changePasswordService,
  forgotPasswordService,
  verifyForgotPasswordOtpService,
  resetPasswordService,
  logoutService,
};
