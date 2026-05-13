const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found in gateway",
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
