const Joi = require("joi");

const objectId = Joi.string().hex().length(24);
const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "WAITING_FOR_PROCESSING",
  "PROCESSING",
  "WAITING_FOR_DELIVERY",
  "DELIVERING",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
];

const paymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

const orderItemSchema = Joi.object({
  productId: objectId.required(),
  name: Joi.string().trim().max(200).required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).required(),
  imageUrl: Joi.string().allow("").default(""),
});

const shippingAddressSchema = Joi.object({
  fullName: Joi.string().trim().max(120).required(),
  phone: Joi.string().trim().max(30).required(),
  address: Joi.string().trim().max(300).required(),
  city: Joi.string().trim().max(120).required(),
  note: Joi.string().trim().max(500).allow("").default(""),
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: shippingAddressSchema.required(),
  paymentMethod: Joi.string().valid("cod", "bank_transfer", "momo").required(),
});

const listOrderSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "processing", "shipped", "delivered", "cancelled")
    .optional(),
  orderStatus: Joi.string().valid(...orderStatuses).optional(),
  paymentStatus: Joi.string().valid(...paymentStatuses).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string().valid(...orderStatuses).required(),
  reason: Joi.string().trim().max(500).allow("").default(""),
});

const updateDeliveryTimeSchema = Joi.object({
  deliveryEstimatedTime: Joi.date().iso().greater("now").required(),
});

const paymentSucceededEventSchema = Joi.object({
  eventId: Joi.string().trim().max(120).required(),
  paymentId: objectId.required(),
  orderId: objectId.required(),
  userId: objectId.optional(),
  amount: Joi.number().min(0).optional(),
  paidAt: Joi.date().iso().optional(),
});

module.exports = {
  createOrderSchema,
  listOrderSchema,
  updateOrderStatusSchema,
  updateDeliveryTimeSchema,
  paymentSucceededEventSchema,
};
