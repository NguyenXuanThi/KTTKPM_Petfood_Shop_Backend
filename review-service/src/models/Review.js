const mongoose = require("mongoose");

const reviewImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      default: "Customer",
      trim: true,
      maxlength: 120,
    },
    avatarUrl: {
      type: String,
      default: "",
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: [reviewImageSchema],
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
    hiddenReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
    hiddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
