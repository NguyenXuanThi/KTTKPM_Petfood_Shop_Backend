const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const uploadRoutes = require("./routes/uploadRoutes");
const { corsOrigin } = require("./config/env");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: true,
  })
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "upload-service",
    status: "ok",
  });
});

app.use("/upload", uploadRoutes);
app.use("/api/upload", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Max size is 5MB",
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

module.exports = app;
