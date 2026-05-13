const Joi = require("joi");

const uploadSchema = Joi.object({
  type: Joi.string().valid("avatar", "product", "chat", "payment").required(),
});

const deleteFileSchema = Joi.object({
  provider: Joi.string().valid("s3", "cloudinary").required(),
  key: Joi.string().trim().min(1).required(),
});

const presignedUploadSchema = Joi.object({
  type: Joi.string().valid("avatar", "product").required(),
  fileName: Joi.string().trim().min(1).max(200).required(),
  mimeType: Joi.string().valid("image/jpeg", "image/png", "image/webp").required(),
  expiresInSec: Joi.number().integer().min(60).max(3600).optional(),
});

module.exports = {
  uploadSchema,
  deleteFileSchema,
  presignedUploadSchema,
};
