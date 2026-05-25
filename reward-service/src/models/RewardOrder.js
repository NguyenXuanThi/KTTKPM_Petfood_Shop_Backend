const mongoose = require("mongoose");

const rewardOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    orderAmount: { type: Number, required: true, min: 0 },
    spinsGranted: { type: Number, required: true, min: 1, max: 3 },
    spinsUsed: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["available", "used", "expired"], default: "available", index: true },
    grantedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

rewardOrderSchema.index({ userId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model("RewardOrder", rewardOrderSchema);
