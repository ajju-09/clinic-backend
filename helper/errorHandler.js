const AppError = require("../utils/AppError");

function normalize(err) {
  if (err instanceof AppError) return err;

  if (err.type === "entity.parse.failed") {
    return AppError.badRequest("Invalid JSON payload");
  }

  if (err.name === "JsonWebTokenError")
    return AppError.unauthorized("Invalid Token");
  if (err.name === "TokenExpiredError")
    return AppError.unauthorized("Token Expired");

  if (err.name === "SequelizeValidationError") {
    return AppError.badRequest(
      "Sequeize Validation failed",
      err.errors.map((e) => ({ field: e.path, message: e.message })),
    );
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return AppError.conflict(
      `Duplicate value for: ${err.errors.map((e) => e.path).join(", ")}`,
    );
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return AppError.badRequest("Invalid reference to a related resource");
  }

  const unknown = new AppError("Something went wrong", 500, "INTERNAL_ERROR");
  return unknown;
}

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const error = normalize(err);

  if (error.statusCode >= 500) {
    console.error({
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id ? req.user.id : null,
    });
  } else {
    console.warn(
      `[${error.statusCode} ${req.method} ${req.originalUrl} - ${error.message}]`,
    );
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.errCode,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  });
};

module.exports = errorHandler;
