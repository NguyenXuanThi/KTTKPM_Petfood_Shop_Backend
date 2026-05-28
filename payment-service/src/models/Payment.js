const mongoose = require("mongoose");

const PAYMENT_METHODS = ["cash", "banking", "vnpay"];
const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "waiting_verify",
  "paid",
  "failed",
  "expired",
];

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      index: true,
    },
    proofImageUrl: {
      type: String,
      default: null,
    },
    proofImagePublicId: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectedReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ paymentMethod: 1, status: 1, createdAt: -1 });

module.exports = {
  Payment: mongoose.model("Payment", paymentSchema),
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
};
