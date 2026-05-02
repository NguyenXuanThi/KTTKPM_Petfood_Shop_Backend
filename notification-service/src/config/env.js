const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.NOTIFICATION_PORT || 3010),
  corsOrigin: process.env.NOTIFICATION_CORS_ORIGIN || "*",
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  allowedRecipient:
    process.env.EMAIL_ALLOWED_RECIPIENT || "vupro0211@gmail.com",
};
