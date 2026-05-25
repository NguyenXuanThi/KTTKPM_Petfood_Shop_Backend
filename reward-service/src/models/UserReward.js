const mongoose = require("mongoose");

const userRewardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    coinBalance: { type: Number, default: 0, min: 0 },
    spinBalance: { type: Number, default: 0, min: 0 },
    totalSpinsEarned: { type: Number, default: 0, min: 0 },
    totalSpinsUsed: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserReward", userRewardSchema);
