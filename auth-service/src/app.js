const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
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
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "auth-service",
    status: "ok",
  });
});

app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((detail) => detail.message),
    });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({
      message: "Email already exists",
    });
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
  };

  if (error.reason) {
    payload.reason = error.reason;
  }

  if (error.canRequestReactivation !== undefined) {
    payload.canRequestReactivation = error.canRequestReactivation;
  }

  if (error.userId) {
    payload.userId = error.userId;
  }

  if (error.remainingSeconds !== undefined) {
    payload.remainingSeconds = error.remainingSeconds;
  }

  if (error.retryAfterSeconds !== undefined) {
    payload.retryAfterSeconds = error.retryAfterSeconds;
  }

  return res.status(statusCode).json(payload);
});

module.exports = app;
