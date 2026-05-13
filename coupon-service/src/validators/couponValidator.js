const Joi = require("joi");

const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(50).required(),
  description: Joi.string().trim().max(500).default(""),
  type: Joi.string().valid("percentage", "fixed").required(),
  discountValue: Joi.number().min(0).required(),
  minOrderAmount: Joi.number().min(0).default(0),
  scope: Joi.string().valid("global", "user", "birthday").default("global"),
  expiresAt: Joi.date().greater("now").required(),
  usageLimit: Joi.number().integer().min(1).allow(null).default(null),
});

const assignCouponSchema = Joi.object({
  couponId: Joi.string().hex().length(24).required(),
  userId: Joi.string().hex().length(24).required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = { createCouponSchema, assignCouponSchema, idParamSchema };
