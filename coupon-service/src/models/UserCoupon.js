const mongoose = require("mongoose");

/**
 * UserCoupon — links a coupon to a specific user.
 *
 * status:
 *   - "active"   → available to use
 *   - "used"     → already redeemed (usage tracking, for order-service)
 *   - "expired"  → coupon expired before use
 *
 * Prepared for future:
 *   - usedAt / orderId  → order-service integration
 *   - notifiedAt        → email notification tracking
 */
const userCouponSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "used", "expired"],
      default: "active",
      index: true,
    },
    assignedBy: {
      type: String,
      enum: ["admin", "system"],
      default: "admin",
    },
    // Populated when redeemed — for order-service integration
    usedAt: {
      type: Date,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // For email notification tracking
    notifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One coupon per user
userCouponSchema.index({ userId: 1, couponId: 1 }, { unique: true });

module.exports = mongoose.model("UserCoupon", userCouponSchema);
