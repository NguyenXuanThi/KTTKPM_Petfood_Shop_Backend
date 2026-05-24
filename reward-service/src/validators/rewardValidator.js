const Joi = require("joi");
const objectId = Joi.string().hex().length(24);

const idParamSchema = Joi.object({ id: objectId.required() });

const grantSpinsSchema = Joi.object({
  userId: objectId.required(),
  orderId: objectId.required(),
  paidAmount: Joi.number().min(0).required(),
});

const rewardPoolSchema = Joi.object({
  type: Joi.string().valid("coin", "coupon").required(),
  label: Joi.string().trim().min(1).max(120).required(),
  coinAmount: Joi.when("type", {
    is: "coin",
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(0).default(0),
  }),
  couponId: Joi.when("type", {
    is: "coupon",
    then: objectId.required(),
    otherwise: objectId.allow(null).optional(),
  }),
  probability: Joi.number().min(0).required(),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().integer().default(0),
});

const rewardPoolUpdateSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120),
  coinAmount: Joi.number().integer().min(1),
  couponId: objectId.allow(null),
  probability: Joi.number().min(0),
  isActive: Joi.boolean(),
  displayOrder: Joi.number().integer(),
}).min(1);

const shopItemSchema = Joi.object({
  couponId: objectId.required(),
  coinCost: Joi.number().integer().min(1).required(),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().integer().default(0),
});

const shopItemUpdateSchema = Joi.object({
  couponId: objectId,
  coinCost: Joi.number().integer().min(1),
  isActive: Joi.boolean(),
  displayOrder: Joi.number().integer(),
}).min(1);

module.exports = {
  idParamSchema,
  grantSpinsSchema,
  rewardPoolSchema,
  rewardPoolUpdateSchema,
  shopItemSchema,
  shopItemUpdateSchema,
};
