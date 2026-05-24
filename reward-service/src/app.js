const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rewardRoutes = require("./routes/rewardRoutes");
const adminRewardRoutes = require("./routes/adminRewardRoutes");
const internalRewardRoutes = require("./routes/internalRewardRoutes");
const { corsOrigin } = require("./config/env");
const { isDatabaseReady } = require("./config/db");

const app = express();
app.use(helmet());
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin, credentials: true }));
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ success: true, service: "reward-service", status: "ok" }));
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/internal")) {
    return next();
  }

  if (!isDatabaseReady()) {
    return res.status(503).json({
      success: false,
      message: "reward-service database is not ready",
    });
  }

  return next();
});
app.use("/api/rewards", rewardRoutes);
app.use("/api/admin/rewards", adminRewardRoutes);
app.use("/internal/rewards", internalRewardRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({ success: false, message: "Validation failed", errors: error.details.map((d) => d.message) });
  }
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ success: false, message: error.message || "Internal server error" });
});

module.exports = app;
