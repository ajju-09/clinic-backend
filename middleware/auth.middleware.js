"use strict";

const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const userServices = require("../services/user.services");
const { isTokenBlacklisted } = require("../config/redis");

const JWT_SECRET = process.env.JWT_SECRET || "clinic_jwt_super_secret_key_2026";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(AppError.unauthorized("Authentication token is required"));
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(AppError.unauthorized("Invalid authorization format"));
    }

    // Check if token has been revoked via logout
    const revoked = await isTokenBlacklisted(token);
    if (revoked) {
      return next(
        AppError.unauthorized("Token has been revoked. Please log in again"),
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(AppError.unauthorized("Token has expired"));
      }
      return next(AppError.unauthorized("Invalid token"));
    }

    const user = await userServices.findUserById(decoded.id);
    if (!user) {
      return next(AppError.unauthorized("User account no longer exists"));
    }

    if (user.status === "suspended") {
      return next(AppError.forbidden("Your account has been suspended"));
    }

    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) return next();

    const revoked = await isTokenBlacklisted(token);
    if (revoked) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return next();
    }

    const user = await userServices.findUserById(decoded.id);
    if (user && user.status !== "suspended") {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };
