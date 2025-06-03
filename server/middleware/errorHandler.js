// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      status: "fail",
      message: `Duplicate value entered for ${field}: ${value}. Please use another value.`,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      status: "fail",
      message: `Invalid input data: ${errors.join(". ")}`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // JWT errors are handled in auth middleware

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: err.status || "error",
    message: err.message || "Something went wrong on the server",
  });
};

module.exports = errorHandler;
