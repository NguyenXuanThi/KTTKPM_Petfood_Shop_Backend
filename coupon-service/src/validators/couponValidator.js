const Joi = require("joi");

const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(50).required(),
  description: Joi.string().trim().max(500).default(""),
  type: Joi.string().valid("percentage", "fixed").required(),
  discountValue: Joi.number().min(0).required(),
  minOrderAmount: Joi.number().min(0).default(0),
  scope: Joi.string().valid("global", "user", "birthday", "reward").default("global"),
  expiresAt: Joi.date().greater("now").allow(null).default(null),
  usageLimit: Joi.number().integer().min(1).allow(null).default(null),
  perUserLimit: Joi.number().integer().min(1).default(1),
  appliesTo: Joi.string().valid("order", "shipping").default("order"),
  maxDiscountAmount: Joi.number().min(0).allow(null).default(null),
});

const assignCouponSchema = Joi.object({
  couponId: Joi.string().hex().length(24).required(),
  userId: Joi.string().hex().length(24).required(),
});

const internalAssignCouponSchema = Joi.object({
  couponId: Joi.string().hex().length(24).required(),
  userId: Joi.string().hex().length(24).required(),
  assignedBy: Joi.string().valid("admin", "system").default("system"),
  source: Joi.string().valid("admin_gift", "birthday", "lucky_spin", "coin_exchange").required(),
  expiresAt: Joi.date().allow(null).optional(),
});

const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const validateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(50).required(),
  orderAmount: Joi.number().min(0),
  subtotal: Joi.number().min(0),
  shippingFee: Joi.number().min(0).default(0),
}).or("orderAmount", "subtotal");

const usableCouponsQuerySchema = Joi.object({
  orderAmount: Joi.number().min(0),
  subtotal: Joi.number().min(0),
  shippingFee: Joi.number().min(0).default(0),
});

const markCouponUsedSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  code: Joi.string().trim().uppercase().min(3).max(50).required(),
  orderId: Joi.string().hex().length(24).required(),
  orderAmount: Joi.number().min(0).required(),
  shippingFee: Joi.number().min(0).default(0),
  discountAmount: Joi.number().min(0).default(0),
});

const batchCouponsSchema = Joi.object({
  couponIds: Joi.array().items(Joi.string().hex().length(24)).min(1).max(100).required(),
});

module.exports = {
  createCouponSchema,
  assignCouponSchema,
  internalAssignCouponSchema,
  idParamSchema,
  validateCouponSchema,
  usableCouponsQuerySchema,
  markCouponUsedSchema,
  batchCouponsSchema,
};
