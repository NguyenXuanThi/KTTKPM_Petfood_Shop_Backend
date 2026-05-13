const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const paymentRoutes = require("./routes/paymentRoutes");
const { corsOrigin } = require("./config/env");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    service: "payment-service",
    status: "ok",
  });
});

app.use("/api", paymentRoutes);
app.use("/", paymentRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, _req, res, _next) => {
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((detail) => detail.message),
    });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size exceeds 5MB limit",
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

module.exports = app;
