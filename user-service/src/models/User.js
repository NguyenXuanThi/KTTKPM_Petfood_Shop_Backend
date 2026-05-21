const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin", "support"],
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    inactiveReason: {
      type: String,
      default: null,
      trim: true,
    },
    inactiveAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },
    reactivationRequestedAt: {
      type: Date,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: "",
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
