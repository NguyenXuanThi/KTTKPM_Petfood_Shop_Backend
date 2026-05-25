const mongoose = require("mongoose");

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    resendWindowStartedAt: {
      type: Date,
      default: Date.now,
    },
    resendAvailableAt: {
      type: Date,
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
passwordResetOtpSchema.index({
  email: 1,
  usedAt: 1,
  invalidatedAt: 1,
});

module.exports = mongoose.model("PasswordResetOtp", passwordResetOtpSchema);
