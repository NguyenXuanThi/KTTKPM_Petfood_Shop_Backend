const mongoose = require("mongoose");

const spinHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    rewardType: { type: String, enum: ["coin", "coupon"], required: true },
    rewardLabel: { type: String, required: true, trim: true },
    coinAmount: { type: Number, default: 0, min: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, default: null },
    playedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SpinHistory", spinHistorySchema);
