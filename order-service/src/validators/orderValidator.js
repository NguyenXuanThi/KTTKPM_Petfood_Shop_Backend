const Joi = require("joi");

const objectId = Joi.string()
  .trim()
  .pattern(/^[a-f\d]{24}$/i);

const createOrderSchema = Joi.object({
  selectedCartItemIds: Joi.array()
    .items(objectId.required())
    .min(1)
    .unique()
    .optional(),
  directItems: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        name: Joi.string().trim().min(1).max(255).required(),
        price: Joi.number().min(0).required(),
        imageUrl: Joi.string().trim().allow("").default(""),
        quantity: Joi.number().integer().min(1).max(999).required(),
      }),
    )
    .min(1)
    .optional(),
  paymentMethod: Joi.string().valid("cash", "banking", "vnpay").required(),
  addressId: objectId.required(),
  couponCode: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(50)
    .allow("")
    .optional(),
  notes: Joi.string().trim().max(1000).allow("").optional(),
}).xor("selectedCartItemIds", "directItems");

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
    .valid("pending", "waiting_verify", "paid", "failed", "unpaid", "expired")
    .required(),
});

const reviewEligibilityQuerySchema = Joi.object({
  userId: objectId.required(),
  productId: objectId.required(),
  orderId: objectId.required(),
});

module.exports = {
  createOrderSchema,
  listAdminOrdersQuerySchema,
  idParamSchema,
  shippingUpdateSchema,
  cancelOrderSchema,
  codPaymentStatusSchema,
  internalPaymentStatusSchema,
  reviewEligibilityQuerySchema,
};
