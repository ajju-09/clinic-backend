"use strict";

const asyncHandler = require("../utils/asyncHandler");
const userServices = require("../services/user.services");

const getReqMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers["user-agent"],
});

/**
 * Check Username Availability
 * GET /api/v1/user/check-username?username=xxx
 */
const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username query parameter is required",
    });
  }
  const result = await userServices.checkUsernameService(username);
  res.status(200).json(result);
});

/**
 * Initiate Registration – validate and save pending user
 * POST /api/v1/user/register
 */
const initiateRegistration = asyncHandler(async (req, res) => {
  const result = await userServices.initiateRegistrationService(
    req.body,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Send or resend the verification code for a pending registration
 * POST /api/v1/user/register/send-otp?email=...
 */
const sendRegistrationOtp = asyncHandler(async (req, res) => {
  const result = await userServices.sendRegistrationOtpService(
    req.query.email,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Verify Registration OTP – activate account, create doctor profile, issue JWT
 * POST /api/v1/user/register/verify-otp
 */
const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const result = await userServices.verifyRegistrationOtpService(
    req.body,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Login User
 * POST /api/v1/user/login
 */
const login = asyncHandler(async (req, res) => {
  const result = await userServices.loginUserService(req.body, getReqMeta(req));
  res.status(200).json(result);
});

/**
 * Complete Doctor Profile
 * POST /api/v1/user/complete-profile
 */
const completeProfile = asyncHandler(async (req, res) => {
  const result = await userServices.completeDoctorProfileService(
    req.user.id,
    req.body,
    getReqMeta(req),
    req.file,
  );
  res.status(200).json(result);
});

/**
 * Get Current Logged-in User Profile
 * GET /api/v1/user/me
 */
const getMe = asyncHandler(async (req, res) => {
  const result = await userServices.getUserProfileService(req.user.id);
  res.status(200).json(result);
});

/**
 * Change Password (Authenticated)
 * POST /api/v1/user/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const result = await userServices.changePasswordService(
    req.user.id,
    req.body,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Forgot Password – send OTP to email (Public)
 * POST /api/v1/user/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body?.email;
  const result = await userServices.forgotPasswordService(
    email,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Verify Forgot Password OTP – returns short-lived resetToken (Public)
 * POST /api/v1/user/forgot-password/verify-otp
 */
const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const result = await userServices.verifyForgotPasswordOtpService(
    req.body,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Reset Password using resetToken issued after OTP verification (Public)
 * POST /api/v1/user/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const result = await userServices.resetPasswordService(
    req.body,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * User Logout (Authenticated)
 * POST /api/v1/user/logout
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.token || req.headers.authorization?.split(" ")[1];
  const result = await userServices.logoutService(
    req.user.id,
    token,
    getReqMeta(req),
  );
  res.status(200).json(result);
});

/**
 * Admin: Get Audit Logs
 * GET /api/v1/user/admin/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await userServices.getAuditLogsService(req.query);
  res.status(200).json(result);
});

module.exports = {
  checkUsername,
  initiateRegistration,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  login,
  completeProfile,
  getMe,
  getAuditLogs,
  changePassword,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  logout,
};
