class AppError extends Error {
  constructor(
    msg,
    statusCode = 500,
    errCode = "INTERNAL_ERROR",
    details = null,
  ) {
    super(msg);
    this.statusCode = statusCode;
    this.errCode = errCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Bad Request", details = null) {
    return new AppError(msg, 400, "BAD_REQUEST", details);
  }
  static unauthorized(msg = "Unauthorized") {
    return new AppError(msg, 401, "UNAUTHORIZED");
  }
  static tooManyRequests(msg = "Too Many Requests") {
    return new AppError(msg, 429, "TOO_MANY_REQUESTS");
  }
  static forbidden(msg = "Forbidden") {
    return new AppError(msg, 403, "FORBIDDEN");
  }
  static notFound(msg = "Not Found") {
    return new AppError(msg, 404, "NOT_FOUND");
  }
  static conflict(msg = "Conflict") {
    return new AppError(msg, 409, "CONFLICT");
  }
  static unprocessable(msg = "Validation Failed", details = null) {
    return new AppError(msg, 422, "VALIDATION_ERROR", details);
  }
}

module.exports = AppError;
