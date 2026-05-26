const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
];

const PAYMENT_METHODS = ["cash", "banking", "vnpay"];
const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "waiting_verify",
  "paid",
  "failed",
  "expired",
];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    province: { type: String, required: true, trim: true, maxlength: 120 },
    district: { type: String, required: true, trim: true, maxlength: 120 },
    ward: { type: String, required: true, trim: true, maxlength: 120 },
    detailAddress: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Order must have at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 30000,
      min: 0,
    },
    shippingDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponShippingDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    estimatedDeliveryAt: {
      type: Date,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    shippingStartedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    cancelledReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    cartRestoredAt: {
      type: Date,
      default: null,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({
  paymentMethod: 1,
  orderStatus: 1,
  paymentStatus: 1,
  expiresAt: 1,
  cartRestoredAt: 1,
});

module.exports = {
  Order: mongoose.model("Order", orderSchema),
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
};
