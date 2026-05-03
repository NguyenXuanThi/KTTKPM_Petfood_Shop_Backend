const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;

const productIdParamSchema = Joi.object({
  productId: Joi.string().trim().pattern(objectIdPattern).required(),
});

const reviewIdParamSchema = Joi.object({
  reviewId: Joi.string().trim().pattern(objectIdPattern).required(),
});

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow("").max(1000).default(""),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().allow("").max(1000),
}).min(1);

module.exports = {
  productIdParamSchema,
  reviewIdParamSchema,
  createReviewSchema,
  updateReviewSchema,
};