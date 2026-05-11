const mongoose = require("mongoose");

const ORDER_STATUSES = [
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

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];

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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
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
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    deliveryEstimatedTime: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveryPopupSeen: {
      type: Boolean,
      default: false,
    },
    processedEventIds: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 });

orderSchema.pre("validate", function normalizeLegacyStatuses(next) {
  if (typeof this.paymentStatus === "string") {
    this.paymentStatus = this.paymentStatus.toUpperCase();
  }

  if (!this.orderStatus) {
    const statusMap = {
      pending: "PENDING_PAYMENT",
      processing: "PROCESSING",
      shipped: "DELIVERING",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
    };
    this.orderStatus = statusMap[this.status] || "PENDING_PAYMENT";
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
