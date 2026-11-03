"use strict";

const multer = require("multer");
const AppError = require("../utils/AppError");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(AppError.badRequest("Cover image must be JPG, PNG, or WebP"));
    }
    callback(null, true);
  },
}).single("coverImage");

module.exports = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(AppError.badRequest("Cover image must be 5 MB or smaller"));
    }
    if (error instanceof multer.MulterError) {
      return next(AppError.badRequest("Only one clinic cover image can be uploaded"));
    }
    next(error);
  });
};
