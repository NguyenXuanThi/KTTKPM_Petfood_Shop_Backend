const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
      index: true,
    },
    imageProvider: {
      type: String,
      required: true,
      default: "s3",
      enum: ["s3", "cloudinary"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: "text" });

module.exports = mongoose.model("Product", productSchema);
