const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = ["USER_MONGODB_URI", "JWT_SECRET", "USER_INTERNAL_KEY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.USER_PORT || 3002),
  mongoUri: process.env.USER_MONGODB_URI,
  corsOrigin: process.env.USER_CORS_ORIGIN || "*",
  bcryptSaltRounds: Number(process.env.USER_BCRYPT_SALT_ROUNDS || 10),
  jwtSecret: process.env.JWT_SECRET,
  internalKey: process.env.USER_INTERNAL_KEY,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || "http://localhost:3003",
  productServiceTimeoutMs: Number(
    process.env.USER_PRODUCT_SERVICE_TIMEOUT_MS || 5000,
  ),
};
