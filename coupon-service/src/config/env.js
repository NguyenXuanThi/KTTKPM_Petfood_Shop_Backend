const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "COUPON_MONGODB_URI",
  "JWT_SECRET",
  "COUPON_INTERNAL_KEY",
  "USER_SERVICE_URL",
  "NOTIFICATION_SERVICE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.COUPON_PORT || 3008),
  mongoUri: process.env.COUPON_MONGODB_URI,
  corsOrigin: process.env.COUPON_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET,
  internalKey: process.env.COUPON_INTERNAL_KEY,
  userServiceUrl: process.env.USER_SERVICE_URL,
  userServiceTimeoutMs: Number(process.env.COUPON_USER_SERVICE_TIMEOUT_MS || 5000),
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
  notificationServiceTimeoutMs: Number(
    process.env.COUPON_NOTIFICATION_SERVICE_TIMEOUT_MS || 5000,
  ),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  redisEnabled: process.env.REDIS_ENABLED !== "false",
};
