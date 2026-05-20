const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "PAYMENT_MONGODB_URI",
  "JWT_SECRET",
  "ORDER_SERVICE_URL",
  "UPLOAD_SERVICE_URL",
  "ORDER_INTERNAL_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PAYMENT_PORT || 3009),
  mongoUri: process.env.PAYMENT_MONGODB_URI,
  corsOrigin: process.env.PAYMENT_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  orderServiceTimeoutMs: Number(process.env.PAYMENT_ORDER_SERVICE_TIMEOUT_MS || 5000),
  uploadServiceUrl: process.env.UPLOAD_SERVICE_URL,
  uploadServiceTimeoutMs: Number(process.env.PAYMENT_UPLOAD_SERVICE_TIMEOUT_MS || 10000),
  orderInternalKey: process.env.ORDER_INTERNAL_KEY,
  paymentInternalKey:
    process.env.PAYMENT_INTERNAL_KEY || process.env.ORDER_INTERNAL_KEY,
};
