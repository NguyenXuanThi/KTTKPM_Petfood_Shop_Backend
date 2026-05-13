const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    province: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    ward: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    detailAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    label: {
      type: String,
      default: "Home",
      trim: true,
      maxlength: 50,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

addressSchema.index({ userId: 1, isDefault: -1, createdAt: -1 });

module.exports = mongoose.model("Address", addressSchema);
