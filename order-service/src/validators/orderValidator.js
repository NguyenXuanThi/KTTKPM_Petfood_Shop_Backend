const Joi = require("joi");

const objectId = Joi.string().trim().pattern(/^[a-f\d]{24}$/i);

const orderItemSchema = Joi.object({
  productId: objectId.required(),
  name: Joi.string().trim().max(200).required(),
  imageUrl: Joi.string().trim().allow("").default(""),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required(),
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  paymentMethod: Joi.string().valid("cash", "banking", "vnpay").required(),
  addressId: objectId.required(),
  notes: Joi.string().trim().max(1000).allow("").optional(),
});

const listAdminOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const idParamSchema = Joi.object({
  id: objectId.required(),
});

const shippingUpdateSchema = Joi.object({
  estimatedDeliveryAt: Joi.date().iso().required(),
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow("").optional(),
});

const codPaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string().valid("paid").required(),
});

const internalPaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid("pending", "waiting_verify", "paid", "failed", "unpaid")
    .required(),
});

module.exports = {
  createOrderSchema,
  listAdminOrdersQuerySchema,
  idParamSchema,
  shippingUpdateSchema,
  cancelOrderSchema,
  codPaymentStatusSchema,
  internalPaymentStatusSchema,
};
