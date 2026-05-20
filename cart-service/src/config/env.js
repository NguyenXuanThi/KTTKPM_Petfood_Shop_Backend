const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "CART_MONGODB_URI",
  "PRODUCT_SERVICE_URL",
  "JWT_SECRET",
  "CART_INTERNAL_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.CART_PORT || 3007),
  mongoUri: process.env.CART_MONGODB_URI,
  corsOrigin: process.env.CART_CORS_ORIGIN || "*",
  productServiceUrl: process.env.PRODUCT_SERVICE_URL,
  jwtSecret: process.env.JWT_SECRET,
  internalKey: process.env.CART_INTERNAL_KEY,
  productServiceTimeoutMs: Number(process.env.CART_PRODUCT_TIMEOUT_MS || 5000),
};
