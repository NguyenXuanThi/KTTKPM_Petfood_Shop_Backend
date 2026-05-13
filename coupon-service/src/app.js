const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const couponRoutes = require("./routes/couponRoutes");
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
  res.status(200).json({ service: "coupon-service", status: "ok" });
});

app.use("/api/coupons", couponRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((d) => d.message),
    });
  }

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ message: error.message || "Internal server error" });
});

module.exports = app;
