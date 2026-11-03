const AppError = require("../utils/AppError");

module.exports =
  (schema, source = "body") =>
  (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(
        AppError.unprocessable(
          "Validation failed",
          error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          })),
        ),
      );
    }

    if (source === "query") {
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      });
    } else {
      req[source] = value;
    }
    next();
  };
