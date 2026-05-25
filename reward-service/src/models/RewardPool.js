const mongoose = require("mongoose");

const rewardPoolSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["coin", "coupon"], required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    coinAmount: { type: Number, default: 0, min: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, default: null },
    probability: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

rewardPoolSchema.pre("validate", function (next) {
  if (this.type === "coin" && (!this.coinAmount || this.coinAmount <= 0)) {
    return next(new Error("Coin reward requires coinAmount > 0"));
  }
  if (this.type === "coupon" && !this.couponId) {
    return next(new Error("Coupon reward requires couponId"));
  }
  return next();
});

module.exports = mongoose.model("RewardPool", rewardPoolSchema);
