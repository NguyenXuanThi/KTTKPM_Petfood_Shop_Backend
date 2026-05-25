const mongoose = require("mongoose");

const rewardShopItemSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    coinCost: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RewardShopItem", rewardShopItemSchema);
