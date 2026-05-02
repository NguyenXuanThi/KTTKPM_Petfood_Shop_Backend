const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "AUTH_SERVICE_URL",
  "PRODUCT_SERVICE_URL",
  "CART_SERVICE_URL",
  "CATEGORY_SERVICE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.API_GATEWAY_PORT || 3000),
  corsOrigin: process.env.API_GATEWAY_CORS_ORIGIN || "*",
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL,
  cartServiceUrl: process.env.CART_SERVICE_URL,
  categoryServiceUrl: process.env.CATEGORY_SERVICE_URL,
  uploadServiceUrl: process.env.UPLOAD_SERVICE_URL || "http://localhost:3006",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3002",
  rateLimitWindowMs: Number(
    process.env.API_GATEWAY_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  ),
  rateLimitMax: Number(process.env.API_GATEWAY_RATE_LIMIT_MAX || 200),
};
