const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "PRODUCT_MONGODB_URI",
  "CATEGORY_SERVICE_URL",
  "UPLOAD_SERVICE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PRODUCT_PORT || 3003),
  mongoUri: process.env.PRODUCT_MONGODB_URI,
  corsOrigin: process.env.PRODUCT_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET || "petfood_secret_key",
  categoryServiceUrl: process.env.CATEGORY_SERVICE_URL,
  categoryServiceTimeoutMs: Number(
    process.env.PRODUCT_CATEGORY_TIMEOUT_MS || 5000,
  ),
  uploadServiceUrl: process.env.UPLOAD_SERVICE_URL,
  uploadServiceTimeoutMs: Number(
    process.env.PRODUCT_UPLOAD_SERVICE_TIMEOUT_MS || 15000,
  ),
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3002",
  userServiceTimeoutMs: Number(
    process.env.PRODUCT_USER_SERVICE_TIMEOUT_MS || 5000,
  ),
  productImageMaxSizeMb: Number(process.env.PRODUCT_IMAGE_MAX_SIZE_MB || 5),
  productImageAllowedMime: (
    process.env.PRODUCT_IMAGE_ALLOWED_MIME || "image/jpeg,image/png,image/webp"
  )
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean),
};
