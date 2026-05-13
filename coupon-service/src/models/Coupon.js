const mongoose = require("mongoose");

/**
 * Coupon model
 *
 * type:
 *   - "percentage"  → discountValue is 0–100 (%)
 *   - "fixed"       → discountValue is an absolute amount
 *
 * scope:
 *   - "global"      → any user can use it (if assigned or public)
 *   - "user"        → assigned to specific users only
 *   - "birthday"    → auto-assigned birthday coupon
 *
 * Prepared for future:
 *   - usageLimit / usedCount  → coupon usage tracking
 *   - minOrderAmount          → order-service integration
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Minimum order amount required to apply this coupon (for order-service)
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    scope: {
      type: String,
      enum: ["global", "user", "birthday"],
      default: "global",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Usage tracking (prepared for future)
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual: is the coupon currently valid?
couponSchema.virtual("isValid").get(function () {
  return this.isActive && this.expiresAt > new Date();
});

module.exports = mongoose.model("Coupon", couponSchema);
