"use strict";

const multer = require("multer");
const AppError = require("../utils/AppError");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedDocumentTypes = new Set([...allowedImageTypes, "application/pdf"]);

const hasAllowedFileSignature = (file) => {
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
  if (file.mimetype === "application/pdf") {
    return buffer.toString("ascii", 0, 5) === "%PDF-";
  }
  return false;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 11,
    fields: 1,
    fieldSize: 2 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    const allowedTypes =
      file.fieldname === "profile_photo" ? allowedImageTypes : allowedDocumentTypes;
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        AppError.badRequest(
          file.fieldname === "profile_photo"
            ? "Profile photo must be JPG, PNG, or WebP"
            : "Documents must be PDF, JPG, PNG, or WebP files",
        ),
      );
    }
    callback(null, true);
  },
}).fields([
  { name: "profile_photo", maxCount: 1 },
  { name: "documents", maxCount: 10 },
]);

module.exports = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();

  upload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Each uploaded document must be 10 MB or smaller"
            : error.code === "LIMIT_FILE_COUNT"
              ? "You can upload up to 10 medical documents"
              : error.code === "LIMIT_UNEXPECTED_FILE"
                ? "Unexpected upload field or too many files"
                : "Invalid media upload";
        return next(AppError.badRequest(message));
      }
      return next(error);
    }

    try {
      const photo = req.files?.profile_photo?.[0];
      if (photo && photo.size > MAX_PROFILE_PHOTO_SIZE) {
        return next(AppError.badRequest("Profile photo must be 5 MB or smaller"));
      }
      const uploadedFiles = [
        ...(photo ? [photo] : []),
        ...(req.files?.documents || []),
      ];
      if (uploadedFiles.some((file) => !hasAllowedFileSignature(file))) {
        return next(AppError.badRequest("An uploaded file does not match its file type"));
      }
      if (!req.body?.patient_data) {
        return next(AppError.badRequest("Patient details are required"));
      }
      req.body = JSON.parse(req.body.patient_data);
      next();
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return next(AppError.badRequest("Patient details must be valid JSON"));
      }
      next(parseError);
    }
  });
};
