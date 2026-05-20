const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceAtAdd: {
      type: Number,
      required: true,
      min: 0,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    lastValidatedAt: {
      type: Date,
      default: null,
    },
    flags: {
      priceChanged: {
        type: Boolean,
        default: false,
      },
      outOfStock: {
        type: Boolean,
        default: false,
      },
      inactiveProduct: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["user", "guest"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    guestToken: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totals: {
      subtotal: {
        type: Number,
        default: 0,
      },
      totalItems: {
        type: Number,
        default: 0,
      },
    },
    restoredOrderIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.index(
  { ownerType: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { ownerType: "user", userId: { $type: "objectId" } },
  }
);

cartSchema.index(
  { ownerType: 1, guestToken: 1 },
  {
    unique: true,
    partialFilterExpression: { ownerType: "guest", guestToken: { $type: "string" } },
  }
);

module.exports = mongoose.model("Cart", cartSchema);
