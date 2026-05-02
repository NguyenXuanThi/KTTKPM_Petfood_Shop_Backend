const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "AUTH_MONGODB_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
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
  port: Number(process.env.AUTH_PORT || 3001),
  mongoUri: process.env.AUTH_MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  corsOrigin: process.env.AUTH_CORS_ORIGIN || "*",
  userServiceUrl: process.env.USER_SERVICE_URL,
  userServiceTimeoutMs: Number(process.env.AUTH_USER_SERVICE_TIMEOUT_MS || 5000),
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
  notificationServiceTimeoutMs: Number(
    process.env.AUTH_NOTIFICATION_SERVICE_TIMEOUT_MS || 5000,
  ),
};
