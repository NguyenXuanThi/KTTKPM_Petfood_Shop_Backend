const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const userRoutes = require("./routes/userRoutes");
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
    service: "user-service",
    status: "ok",
  });
});

app.use("/users", userRoutes);
app.use("/api/users", userRoutes);

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

  if (statusCode >= 500) {
    console.error("[user-service error]", error);
  }

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
});

module.exports = app;
