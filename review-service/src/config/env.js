const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const requiredEnvVars = [
  "REVIEW_MONGODB_URI",
  "JWT_SECRET",
  "ORDER_SERVICE_URL",
  "ORDER_INTERNAL_KEY",
  "PRODUCT_SERVICE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.REVIEW_PORT || 3013),
  mongoUri: process.env.REVIEW_MONGODB_URI,
  corsOrigin: process.env.REVIEW_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  orderInternalKey: process.env.ORDER_INTERNAL_KEY,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL,
  productInternalKey:
    process.env.PRODUCT_INTERNAL_KEY || process.env.ORDER_INTERNAL_KEY || "petfood_internal_key",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3002",
  serviceTimeoutMs: Number(process.env.REVIEW_SERVICE_TIMEOUT_MS || 5000),
};
