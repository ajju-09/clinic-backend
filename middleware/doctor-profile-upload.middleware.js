"use strict";

const multer = require("multer");
const AppError = require("../utils/AppError");

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const hasAllowedImageSignature = (file) => {
  const buffer = file.buffer;
  if (file.mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE,
    files: 1,
    fields: 1,
    fieldSize: 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!allowedImageTypes.has(file.mimetype)) {
      return callback(AppError.badRequest("Profile image must be JPG, PNG, or WebP."));
    }
    callback(null, true);
  },
}).single("profile_image");

module.exports = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();

  upload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE"
          ? "Profile image must be 5 MB or smaller."
          : "Invalid profile image upload.";
        return next(AppError.badRequest(message));
      }
      return next(error);
    }

    try {
      if (!req.body?.profile_data) {
        return next(AppError.badRequest("Doctor profile details are required."));
      }
      if (req.file && !hasAllowedImageSignature(req.file)) {
        return next(AppError.badRequest("The uploaded image does not match its file type."));
      }
      req.body = JSON.parse(req.body.profile_data);
      next();
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return next(AppError.badRequest("Doctor profile details must be valid JSON."));
      }
      next(parseError);
    }
  });
};
