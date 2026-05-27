const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = ["CATEGORY_MONGODB_URI"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.CATEGORY_PORT || 3005),
  mongoUri: process.env.CATEGORY_MONGODB_URI,
  corsOrigin: process.env.CATEGORY_CORS_ORIGIN || "*",
  menuCacheTtlMs: Number(process.env.CATEGORY_MENU_CACHE_TTL_MS || 60000),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  redisEnabled: process.env.REDIS_ENABLED !== "false",
};
