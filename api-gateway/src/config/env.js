const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "AUTH_SERVICE_URL",
  "USER_SERVICE_URL",
  "PRODUCT_SERVICE_URL",
  "CATEGORY_SERVICE_URL",
  "CART_SERVICE_URL",
  "UPLOAD_SERVICE_URL",
  "COUPON_SERVICE_URL",
  "ORDER_SERVICE_URL",
  "PAYMENT_SERVICE_URL",
  "NOTIFICATION_SERVICE_URL",
  "JWT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.API_GATEWAY_PORT || 3000),
  corsOrigin: process.env.API_GATEWAY_CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,

  authServiceUrl: process.env.AUTH_SERVICE_URL,
  userServiceUrl: process.env.USER_SERVICE_URL,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL,
  categoryServiceUrl: process.env.CATEGORY_SERVICE_URL,
  cartServiceUrl: process.env.CART_SERVICE_URL,
  uploadServiceUrl: process.env.UPLOAD_SERVICE_URL,
  couponServiceUrl: process.env.COUPON_SERVICE_URL,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL,
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:3011", // AI chatbot
  chatServiceUrl: process.env.CHAT_SERVICE_URL || "http://localhost:3012", // User-Admin chat

  rateLimitWindowMs: Number(
    process.env.API_GATEWAY_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  ),
  rateLimitMax: Number(process.env.API_GATEWAY_RATE_LIMIT_MAX || 200),
  proxyTimeoutMs: Number(process.env.API_GATEWAY_PROXY_TIMEOUT_MS || 15000),
};
