const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;

const createProductSchema = Joi.object({
  name: Joi.string().trim().max(150).required(),
  description: Joi.string().trim().allow("").max(2000).default(""),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
  categoryId: Joi.string().trim().pattern(objectIdPattern).allow("", null),
  isActive: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().max(150),
  description: Joi.string().trim().allow("").max(2000),
  price: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  categoryId: Joi.string().trim().pattern(objectIdPattern).allow("", null),
  isActive: Joi.boolean(),
}).min(1);

const listProductSchema = Joi.object({
  keyword: Joi.string().trim().allow(""),
  categoryId: Joi.string().trim().pattern(objectIdPattern),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "name", "price")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

const ratingSummarySchema = Joi.object({
  averageRating: Joi.number().min(0).max(5).required(),
  reviewCount: Joi.number().integer().min(0).required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  ratingSummarySchema,
};
