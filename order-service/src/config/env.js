const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const requiredEnvVars = [
  "ORDER_MONGODB_URI",
  "JWT_SECRET",
  "ORDER_INTERNAL_KEY",
  "USER_SERVICE_URL",
  "USER_INTERNAL_KEY",
  "PAYMENT_SERVICE_URL",
  "CART_SERVICE_URL",
  "CART_INTERNAL_KEY",
  "COUPON_SERVICE_URL",
  "COUPON_INTERNAL_KEY",
  "REWARD_SERVICE_URL",
  "REWARD_INTERNAL_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.ORDER_PORT || 3004),
  mongoUri: process.env.ORDER_MONGODB_URI,
  corsOrigin: process.env.ORDER_CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET,
  internalKey: process.env.ORDER_INTERNAL_KEY,
  userServiceUrl: process.env.USER_SERVICE_URL,
  userInternalKey: process.env.USER_INTERNAL_KEY,
  userServiceTimeoutMs: Number(
    process.env.ORDER_USER_SERVICE_TIMEOUT_MS || 5000,
  ),
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL,
  paymentInternalKey:
    process.env.PAYMENT_INTERNAL_KEY || process.env.ORDER_INTERNAL_KEY,
  paymentServiceTimeoutMs: Number(
    process.env.ORDER_PAYMENT_SERVICE_TIMEOUT_MS || 5000,
  ),
  cartServiceUrl: process.env.CART_SERVICE_URL,
  cartInternalKey: process.env.CART_INTERNAL_KEY,
  cartServiceTimeoutMs: Number(process.env.ORDER_CART_SERVICE_TIMEOUT_MS || 5000),
  couponServiceUrl: process.env.COUPON_SERVICE_URL,
  couponInternalKey: process.env.COUPON_INTERNAL_KEY,
  couponServiceTimeoutMs: Number(process.env.ORDER_COUPON_SERVICE_TIMEOUT_MS || 5000),
  rewardServiceUrl: process.env.REWARD_SERVICE_URL,
  rewardInternalKey: process.env.REWARD_INTERNAL_KEY,
  rewardServiceTimeoutMs: Number(process.env.ORDER_REWARD_SERVICE_TIMEOUT_MS || 5000),
};
