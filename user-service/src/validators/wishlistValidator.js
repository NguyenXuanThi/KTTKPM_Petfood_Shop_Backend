const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;

const wishlistBodySchema = Joi.object({
  productId: Joi.string().trim().pattern(objectIdPattern).required(),
});

const productIdParamSchema = Joi.object({
  productId: Joi.string().trim().pattern(objectIdPattern).required(),
});

module.exports = {
  wishlistBodySchema,
  productIdParamSchema,
};