const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const cloudinaryEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const envVar of cloudinaryEnvVars) {
  const value = process.env[envVar];
  const isPlaceholder =
    value.startsWith("your_") ||
    (value.startsWith("<") && value.endsWith(">"));

  if (isPlaceholder) {
    throw new Error(
      "Cloudinary credentials are missing or invalid. Please update .env",
    );
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.UPLOAD_PORT || 3006),
  corsOrigin: process.env.UPLOAD_CORS_ORIGIN || "*",
  maxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 5),
  allowedMimeTypes: (process.env.UPLOAD_ALLOWED_MIME_TYPES || "image/jpeg,image/png,image/webp")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),

  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsBucket: process.env.AWS_S3_BUCKET,
  awsPublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || "",
  presignedUrlExpiresInSec: Number(process.env.UPLOAD_PRESIGNED_EXPIRES_IN_SEC || 600),

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
};
