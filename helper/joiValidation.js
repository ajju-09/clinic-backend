"use strict";

const Joi = require("joi");
const { USER_ROLES } = require("../helper/constant");

const passwordRule = Joi.string()
  .min(8)
  .max(15)
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/\d/, "digit")
  .pattern(/[^A-Za-z0-9]/, "special character")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 15 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  });

const usernameRule = Joi.string()
  .trim()
  .lowercase()
  .min(3)
  .max(30)
  .pattern(/^[a-z0-9_]+$/)
  .messages({
    "string.pattern.base":
      "Username may contain only letters, numbers and underscores",
  });

const emailRule = Joi.string()
  .trim()
  .lowercase()
  .max(255)
  .email({ tlds: { allow: true } });

const nameRule = Joi.string().trim().min(1).max(50);
const timezoneRule = Joi.string()
  .trim()
  .max(64)
  .custom((value, helpers) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return value;
    } catch {
      return helpers.error("any.invalid");
    }
  })
  .messages({ "any.invalid": "Timezone must be a valid IANA timezone." });

const otpRule = Joi.string().trim().length(6).pattern(/^\d{6}$/).messages({
  "string.length": "OTP must be exactly 6 digits",
  "string.pattern.base": "OTP must contain only digits",
  "any.required": "OTP is required",
});

// ─── Registration Schemas ──────────────────────────────────────────────────────

/** Step 1: Submit registration form and save a pending user */
const initiateRegistrationSchema = Joi.object({
  first_name: nameRule.required().messages({
    "any.required": "First name is required",
  }),
  last_name: nameRule.required().messages({
    "any.required": "Last name is required",
  }),
  username: usernameRule.required().messages({
    "any.required": "Username is required",
  }),
  email: emailRule.required().messages({
    "any.required": "Email is required",
  }),
  password: passwordRule.required().messages({
    "any.required": "Password is required",
  }),
  role: Joi.string().trim().required().valid(USER_ROLES.MD, USER_ROLES.ADMIN).default(USER_ROLES.MD),
}).options({ abortEarly: false, stripUnknown: true });

const sendRegistrationOtpSchema = Joi.object({
  email: emailRule.required().messages({
    "any.required": "Email is required",
  }),
}).options({ abortEarly: false, stripUnknown: true });

/** Step 2: Verify registration OTP → account activated */
const verifyRegistrationOtpSchema = Joi.object({
  email: emailRule.required().messages({ "any.required": "Email is required" }),
  otp: otpRule.required(),
}).options({ abortEarly: false, stripUnknown: true });

// ─── Login Schema ──────────────────────────────────────────────────────────────

const loginSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    "any.required": "Email or username is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
  role: Joi.string().trim().required().valid(USER_ROLES.MD, USER_ROLES.ADMIN).default(USER_ROLES.MD),
}).options({ abortEarly: false, stripUnknown: true });

// ─── Complete Doctor Profile Schema ───────────────────────────────────────────

const completeProfileSchema = Joi.object({
  medical_registration_no: Joi.string().trim().min(1).max(50).required(),
  phone: Joi.string().trim().min(1).max(20).required(),
  gender: Joi.string().trim().valid("Male", "Female", "Others").required(),
  bio: Joi.string().trim().min(1).required(),
  experience_years: Joi.number().integer().min(0).max(65535).required(),
  specialization: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .min(1)
    .max(14)
    .required(),
  qualification: Joi.string().trim().min(1).max(150).required(),
}).options({ abortEarly: false, stripUnknown: true });

const clinicFields = {
  name: Joi.string().trim().min(1).max(150),
  clinicType: Joi.string().trim().max(50).allow(null, ""),
  description: Joi.string().trim().max(2000).allow(null, ""),
  address: Joi.string().trim().min(1),
  addressLine2: Joi.string().trim().max(255).allow(null, ""),
  city: Joi.string().trim().max(100).allow(null, ""),
  state: Joi.string().trim().max(100).allow(null, ""),
  pinCode: Joi.string().trim().max(20).allow(null, ""),
  phone: Joi.string().trim().max(10).allow(null, ""),
  alternatePhone: Joi.string().trim().max(10).allow(null, ""),
  email: emailRule.allow(null, ""),
  website: Joi.string().trim().uri({ scheme: ["http", "https"] }).max(255).allow(null, ""),
  registrationNo: Joi.string().trim().max(100).allow(null, ""),
  workingHours: Joi.string().trim().max(255).allow(null, ""),
  timezone: timezoneRule,
  specialties: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .max(50)
    .allow(null),
};

const createClinicSchema = Joi.object({
  ...clinicFields,
  name: clinicFields.name.required(),
  address: clinicFields.address.required(),
}).options({ abortEarly: false, stripUnknown: true });

const updateClinicSchema = Joi.object(clinicFields)
  .min(1)
  .options({ abortEarly: false, stripUnknown: true });

const clinicIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

// ─── Change Password Schema ───────────────────────────────────────────────────

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().allow(null, "").optional(),
  oldPassword: Joi.string().allow(null, "").optional(),
  newPassword: passwordRule.required().messages({
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Confirm password is required",
    }),
})
  .custom((value, helpers) => {
    if (!value.currentPassword && !value.oldPassword) {
      return helpers.error("any.custom", {
        message: "Current password is required",
      });
    }
    return value;
  })
  .messages({
    "any.custom": "{#message}",
  })
  .options({ abortEarly: false, stripUnknown: true });

// ─── Forgot Password Schemas ──────────────────────────────────────────────────

/** Step 1: Submit email → OTP is sent */
const forgotPasswordSchema = Joi.object({
  email: emailRule.required().messages({
    "any.required": "Email is required",
  }),
}).options({ abortEarly: false, stripUnknown: true });

/** Step 2: Verify OTP → receive resetToken */
const verifyForgotPasswordOtpSchema = Joi.object({
  email: emailRule.required().messages({ "any.required": "Email is required" }),
  otp: otpRule.required(),
}).options({ abortEarly: false, stripUnknown: true });

// ─── Reset Password Schema ────────────────────────────────────────────────────

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required().messages({
    "any.required": "Reset token is required",
  }),
  newPassword: passwordRule.required().messages({
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Confirm password is required",
    }),
}).options({ abortEarly: false, stripUnknown: true });

// ─── Legacy / Misc Schemas ────────────────────────────────────────────────────

const createUserSchema = Joi.object({
  first_name: nameRule.required(),
  username: usernameRule.required(),
  email: emailRule.required(),
  password: passwordRule.required(),
}).options({ abortEarly: false, stripUnknown: true });

const updateUserSchema = Joi.object({
  first_name: nameRule,
  last_name: nameRule.allow(null),
  username: usernameRule,
  email: emailRule,
})
  .min(1)
  .options({ abortEarly: false, stripUnknown: true });

const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  // Registration
  initiateRegistrationSchema,
  sendRegistrationOtpSchema,
  verifyRegistrationOtpSchema,
  // Login
  loginSchema,
  // Profile
  completeProfileSchema,
  // Clinics
  createClinicSchema,
  updateClinicSchema,
  clinicIdParamSchema,
  // Change password
  changePasswordSchema,
  // Forgot password
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  // Reset password
  resetPasswordSchema,
  // Misc
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
};
