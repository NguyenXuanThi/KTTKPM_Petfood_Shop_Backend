const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const requiredEnvVars = [
  "REWARD_MONGODB_URI",
  "JWT_SECRET",
  "REWARD_INTERNAL_KEY",
  "COUPON_SERVICE_URL",
  "COUPON_INTERNAL_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.REWARD_PORT || 3014),
  mongoUri: process.env.REWARD_MONGODB_URI,
  corsOrigin: process.env.REWARD_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET,
  internalKey: process.env.REWARD_INTERNAL_KEY,
  couponServiceUrl: process.env.COUPON_SERVICE_URL,
  couponInternalKey: process.env.COUPON_INTERNAL_KEY,
  serviceTimeoutMs: Number(process.env.REWARD_SERVICE_TIMEOUT_MS || 5000),
};
