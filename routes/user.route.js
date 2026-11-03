"use strict";

const express = require("express");
const route = express.Router();
const userController = require("../controllers/user.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const doctorProfileUpload = require("../middleware/doctor-profile-upload.middleware");
const {
  initiateRegistrationSchema,
  sendRegistrationOtpSchema,
  verifyRegistrationOtpSchema,
  loginSchema,
  completeProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordSchema,
} = require("../helper/joiValidation");

// ─── Registration (Public) ────────────────────────────────────────────────────

// Step 1: Submit form → validate and save pending user
route.post(
  "/register",
  validationMiddleware(initiateRegistrationSchema),
  userController.initiateRegistration,
);

// Step 2: Send or resend OTP to the pending account's email
route.post(
  "/register/send-otp",
  validationMiddleware(sendRegistrationOtpSchema, "query"),
  userController.sendRegistrationOtp,
);

// Step 3: Verify OTP → activate account, issue JWT
route.post(
  "/register/verify-otp",
  validationMiddleware(verifyRegistrationOtpSchema),
  userController.verifyRegistrationOtp,
);

// ─── Username Availability ────────────────────────────────────────────────────
route.get("/check-username", userController.checkUsername);

// ─── Login ────────────────────────────────────────────────────────────────────
route.post("/login", validationMiddleware(loginSchema), userController.login);

// ─── Protected – requires valid JWT ──────────────────────────────────────────

// Complete Doctor Profile (authenticated from dashboard)
route.post(
  "/complete-profile",
  authenticate,
  doctorProfileUpload,
  validationMiddleware(completeProfileSchema),
  userController.completeProfile,
);

// Get Current User & Doctor Profile Status
route.get("/me", authenticate, userController.getMe);

// Change Password
route.post(
  "/change-password",
  authenticate,
  validationMiddleware(changePasswordSchema),
  userController.changePassword,
);

// Logout (revokes token)
route.post("/logout", authenticate, userController.logout);

// ─── Forgot Password (Public) ─────────────────────────────────────────────────

// Step 1: Submit email → send OTP
route.post(
  "/forgot-password",
  validationMiddleware(forgotPasswordSchema),
  userController.forgotPassword,
);

// Step 2: Verify OTP → receive short-lived resetToken
route.post(
  "/forgot-password/verify-otp",
  validationMiddleware(verifyForgotPasswordOtpSchema),
  userController.verifyForgotPasswordOtp,
);

// Step 3: Reset password using resetToken
route.post(
  "/reset-password",
  validationMiddleware(resetPasswordSchema),
  userController.resetPassword,
);

// ─── Admin ────────────────────────────────────────────────────────────────────
route.get("/admin/audit-logs", authenticate, userController.getAuditLogs);

module.exports = route;
