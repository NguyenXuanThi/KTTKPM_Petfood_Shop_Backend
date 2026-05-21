const Joi = require("joi");

const objectId = Joi.string().trim().pattern(/^[a-f\d]{24}$/i);

const productIdParamSchema = Joi.object({
  productId: objectId.required(),
});

const idParamSchema = Joi.object({
  id: objectId.required(),
});

const listReviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid("createdAt", "rating").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

const adminListReviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid("visible", "hidden", "all").default("all"),
  search: Joi.string().trim().allow("").default(""),
  productId: objectId.optional(),
  userId: objectId.optional(),
});

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().trim().allow("").default(""),
});

const createReviewSchema = Joi.object({
  productId: objectId.required(),
  orderId: objectId.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(1).max(1000).required(),
  images: Joi.array().items(imageSchema).max(5).default([]),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().min(1).max(1000),
  images: Joi.array().items(imageSchema).max(5),
}).min(1);

const hideReviewSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
});

module.exports = {
  productIdParamSchema,
  idParamSchema,
  listReviewsQuerySchema,
  adminListReviewsQuerySchema,
  createReviewSchema,
  updateReviewSchema,
  hideReviewSchema,
};
