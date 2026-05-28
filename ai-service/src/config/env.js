const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  PORT: Number(process.env.AI_PORT || process.env.CHAT_PORT || 3011),
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/petfood_ai",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  CORS_ORIGIN:
    process.env.AI_CORS_ORIGIN || process.env.CHAT_CORS_ORIGIN || "*",
  NODE_ENV: process.env.NODE_ENV || "development",
  PRODUCT_SERVICE_URL:
    process.env.PRODUCT_SERVICE_URL || "http://localhost:3003",
  PRODUCT_INTERNAL_KEY:
    process.env.PRODUCT_INTERNAL_KEY || process.env.ORDER_INTERNAL_KEY || "petfood_internal_key",
  CATEGORY_SERVICE_URL:
    process.env.CATEGORY_SERVICE_URL || "http://localhost:3005",
  APPOINTMENT_SERVICE_URL:
    process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3015",
  // Kafka broker(s) — comma-separated if multiple, e.g. "kafka1:9092,kafka2:9092"
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || "localhost:9092",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  REDIS_ENABLED: process.env.REDIS_ENABLED !== "false",
};
