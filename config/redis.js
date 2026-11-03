"use strict";

const Redis = require("ioredis");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log(`[Redis] Connected successfully to ${redisHost}:${redisPort}`);
});

redis.on("error", (err) => {
  console.error(`[Redis] Connection error: ${err.message}`);
});

/**
 * OTP Redis Helpers
 * Default TTL: 60 seconds (1 minute)
 */
const OTP_PREFIX = "otp:";

const setOtp = async (email, otp, ttlSeconds = 60) => {
  const key = `${OTP_PREFIX}${email.toLowerCase().trim()}`;
  const data = JSON.stringify({
    otp: otp.toString().trim(),
    attempts: 0,
    created_at: Date.now(),
  });
  await redis.set(key, data, "EX", ttlSeconds);
};

const getOtpData = async (email) => {
  const key = `${OTP_PREFIX}${email.toLowerCase().trim()}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const incrementOtpAttempt = async (email) => {
  const key = `${OTP_PREFIX}${email.toLowerCase().trim()}`;
  const ttl = await redis.ttl(key);
  if (ttl <= 0) return null;

  const data = await getOtpData(email);
  if (!data) return null;

  data.attempts = (data.attempts || 0) + 1;
  await redis.set(key, JSON.stringify(data), "EX", ttl);
  return data.attempts;
};

const deleteOtp = async (email) => {
  const key = `${OTP_PREFIX}${email.toLowerCase().trim()}`;
  await redis.del(key);
};

/**
 * Password Reset Token Redis Helpers
 * Default TTL: 900 seconds (15 minutes)
 */
const RESET_TOKEN_PREFIX = "reset_token:";

const setPasswordResetToken = async (token, data, ttlSeconds = 900) => {
  try {
    const key = `${RESET_TOKEN_PREFIX}${token}`;
    const value = typeof data === "object" ? JSON.stringify(data) : String(data);
    await redis.set(key, value, "EX", ttlSeconds);
    return true;
  } catch (err) {
    console.error("[Redis Error] setPasswordResetToken failed:", err.message);
    return false;
  }
};

const getPasswordResetToken = async (token) => {
  try {
    const key = `${RESET_TOKEN_PREFIX}${token}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    console.error("[Redis Error] getPasswordResetToken failed:", err.message);
    return null;
  }
};

const deletePasswordResetToken = async (token) => {
  try {
    const key = `${RESET_TOKEN_PREFIX}${token}`;
    await redis.del(key);
  } catch (err) {
    console.error("[Redis Error] deletePasswordResetToken failed:", err.message);
  }
};

/**
 * Token Blacklist Redis Helpers (for Logout)
 * Stores revoked JWTs until expiration
 */
const BLACKLIST_PREFIX = "blacklist:";

const blacklistToken = async (token, ttlSeconds = 86400) => {
  try {
    const key = `${BLACKLIST_PREFIX}${token}`;
    await redis.set(key, "revoked", "EX", Math.max(Number(ttlSeconds) || 3600, 60));
    return true;
  } catch (err) {
    console.error("[Redis Error] blacklistToken failed:", err.message);
    return false;
  }
};

const isTokenBlacklisted = async (token) => {
  try {
    const key = `${BLACKLIST_PREFIX}${token}`;
    const result = await redis.get(key);
    return Boolean(result);
  } catch (err) {
    console.error("[Redis Error] isTokenBlacklisted failed:", err.message);
    return false;
  }
};

module.exports = {
  redis,
  setOtp,
  getOtpData,
  incrementOtpAttempt,
  deleteOtp,
  setPasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  blacklistToken,
  isTokenBlacklisted,
};
