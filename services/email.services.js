"use strict";

const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback dev transporter (logs to console)
  return {
    sendMail: async (options) => {
      console.log("--- [DEV EMAIL DISPATCHED] ---");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.text || options.html}`);
      console.log("------------------------------");
      return { messageId: `mock-${Date.now()}` };
    },
  };
};

const transporter = createTransporter();

exports.sendOtpEmail = async (email, otp, expiresInMinutes = 5) => {
  const from = process.env.SMTP_FROM || "MediPulse OS <no-reply@medipulse.local>";
  const subject = "Your Clinic App Verification Code";
  const text = `Hello,\n\nYour 6-digit verification code for MediPulse Clinic App is: ${otp}\n\nThis code is valid for ${expiresInMinutes} minutes. If you did not request this, please disregard this message.\n\nBest regards,\nMediPulse OS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0284c7; margin-top: 0;">MediPulse Verification</h2>
      <p style="color: #475569; font-size: 15px;">Use the 6-digit code below to verify your email address:</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 28px; font-weight: 700; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 13px;">This code expires in <strong>${expiresInMinutes} minutes</strong>. Never share this code with anyone.</p>
    </div>
  `;

  try {
    const res = await transporter.sendMail({ from, to: email, subject, text, html });
    console.log(`[Email] OTP sent to ${email} (MessageId: ${res.messageId})`);
    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send OTP email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

exports.sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  const from = process.env.SMTP_FROM || "MediPulse OS <no-reply@medipulse.local>";
  const subject = "Reset Your Password - MediPulse OS";
  const text = `Hello,\n\nYou requested to reset your password for MediPulse OS.\n\nPlease use the link below to set a new password:\n${resetLink}\n\nReset Token: ${resetToken}\n\nThis link is valid for 15 minutes. If you did not request this, please disregard this email.\n\nBest regards,\nMediPulse OS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0284c7; margin-top: 0;">MediPulse Password Reset</h2>
      <p style="color: #475569; font-size: 15px;">We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #0284c7; word-break: break-all;">${resetLink}</a></p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">This link expires in <strong>15 minutes</strong>. If you did not make this request, your account remains completely safe.</p>
    </div>
  `;

  try {
    const res = await transporter.sendMail({ from, to: email, subject, text, html });
    console.log(`[Email] Password reset sent to ${email} (MessageId: ${res.messageId})`);
    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send password reset email to ${email}:`, error.message);
    console.log(`[DEV FALLBACK] Password reset link for ${email}: ${resetLink}`);
    return { success: false, error: error.message };
  }
};


exports.sendPasswordResetOtpEmail = async (email, otp) => {
  const from = process.env.SMTP_FROM || "MediPulse OS <no-reply@medipulse.local>";
  const subject = "Your Password Reset Code - MediPulse OS";
  const text = `Hello,\n\nYour 6-digit password reset code for MediPulse OS is: ${otp}\n\nThis code is valid for 10 minutes. Never share this code with anyone.\n\nIf you did not request a password reset, please disregard this email.\n\nBest regards,\nMediPulse OS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0284c7; margin-top: 0;">MediPulse Password Reset</h2>
      <p style="color: #475569; font-size: 15px;">Use the 6-digit code below to reset your password:</p>
      <div style="background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 28px; font-weight: 700; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Never share this code with anyone.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you did not request a password reset, your account remains safe. You can ignore this email.</p>
    </div>
  `;

  try {
    const res = await transporter.sendMail({ from, to: email, subject, text, html });
    console.log(`[Email] Password reset OTP sent to ${email} (MessageId: ${res.messageId})`);
    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send password reset OTP to ${email}:`, error.message);
    console.log(`[DEV FALLBACK] Password reset OTP for ${email}: ${otp}`);
    return { success: false, error: error.message };
  }
};
