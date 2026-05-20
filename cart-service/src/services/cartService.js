const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const { getProductById } = require("./productClient");

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const ensureValidObjectId = (id, message = "Invalid product id") => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const buildOwnerFilter = (owner) => {
  if (owner.ownerType === "user") {
    return {
      ownerType: "user",
      userId: toObjectId(owner.userId),
    };
  }

  return {
    ownerType: "guest",
    guestToken: owner.guestToken,
  };
};

const recalculateTotals = (cart) => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  cart.totals = {
    subtotal,
    totalItems,
  };
};

const normalizeCartResponse = (cart) => ({
  id: cart._id,
  ownerType: cart.ownerType,
  userId: cart.userId,
  guestToken: cart.guestToken,
  items: cart.items,
  totals: cart.totals,
  createdAt: cart.createdAt,
  updatedAt: cart.updatedAt,
});

const normalizeCheckoutItem = (item) => ({
  productId: item.productId.toString(),
  quantity: Number(item.quantity),
  priceAtAdd: Number(item.priceAtAdd),
  productName: item.productName,
  imageUrl: item.imageUrl || "",
  lastValidatedAt: item.lastValidatedAt,
  flags: {
    priceChanged: Boolean(item.flags?.priceChanged),
    outOfStock: Boolean(item.flags?.outOfStock),
    inactiveProduct: Boolean(item.flags?.inactiveProduct),
  },
});

const findOrCreateCart = async (owner) => {
  const filter = buildOwnerFilter(owner);
  let cart = await Cart.findOne(filter);

  if (!cart) {
    cart = await Cart.create({
      ...filter,
      items: [],
      totals: {
        subtotal: 0,
        totalItems: 0,
      },
    });
  }

  return cart;
};

const addItem = async (owner, payload) => {
  ensureValidObjectId(payload.productId);

  const cart = await findOrCreateCart(owner);
  const product = await getProductById(payload.productId);

  if (!product.isActive) {
    const error = new Error("Product is inactive");
    error.statusCode = 400;
    throw error;
  }

  const existedItem = cart.items.find((item) => item.productId.toString() === payload.productId);

  if (existedItem) {
    existedItem.quantity += payload.quantity;
    existedItem.priceAtAdd = Number(product.price);
    existedItem.productName = product.name;
    existedItem.imageUrl = product.imageUrl || "";
    existedItem.flags = {
      priceChanged: false,
      outOfStock: false,
      inactiveProduct: false,
    };
  } else {
    cart.items.push({
      productId: payload.productId,
      quantity: payload.quantity,
      priceAtAdd: Number(product.price),
      productName: product.name,
      imageUrl: product.imageUrl || "",
      flags: {
        priceChanged: false,
        outOfStock: false,
        inactiveProduct: false,
      },
      lastValidatedAt: null,
    });
  }

  recalculateTotals(cart);
  await cart.save();

  return normalizeCartResponse(cart);
};

const updateItemQuantity = async (owner, productId, quantity) => {
  ensureValidObjectId(productId);

  const cart = await findOrCreateCart(owner);
  const item = cart.items.find((entry) => entry.productId.toString() === productId);

  if (!item) {
    const error = new Error("Item not found in cart");
    error.statusCode = 404;
    throw error;
  }

  item.quantity = quantity;
  recalculateTotals(cart);
  await cart.save();

  return normalizeCartResponse(cart);
};

const removeItem = async (owner, productId) => {
  ensureValidObjectId(productId);

  const cart = await findOrCreateCart(owner);
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((entry) => entry.productId.toString() !== productId);

  if (cart.items.length === originalLength) {
    const error = new Error("Item not found in cart");
    error.statusCode = 404;
    throw error;
  }

  recalculateTotals(cart);
  await cart.save();

  return normalizeCartResponse(cart);
};

const clearCart = async (owner) => {
  const cart = await findOrCreateCart(owner);
  cart.items = [];
  recalculateTotals(cart);
  await cart.save();

  return normalizeCartResponse(cart);
};

const syncItemWithProduct = async (item) => {
  try {
    const product = await getProductById(item.productId.toString());

    const flags = {
      priceChanged: Number(item.priceAtAdd) !== Number(product.price),
      outOfStock: Number(product.stock) < Number(item.quantity),
      inactiveProduct: !Boolean(product.isActive),
    };

    item.flags = flags;
    item.lastValidatedAt = new Date();

    return {
      productId: item.productId,
      issues: Object.entries(flags)
        .filter(([, value]) => value)
        .map(([key]) => key),
    };
  } catch (error) {
    if (error.statusCode === 404) {
      const flags = {
        priceChanged: false,
        outOfStock: true,
        inactiveProduct: true,
      };

      item.flags = flags;
      item.lastValidatedAt = new Date();

      return {
        productId: item.productId,
        issues: ["outOfStock", "inactiveProduct"],
      };
    }

    throw error;
  }
};

const syncCartWithProducts = async (cart) => {
  const validationResult = await Promise.all(
    cart.items.map((item) => syncItemWithProduct(item))
  );

  recalculateTotals(cart);
  await cart.save();

  const issues = validationResult.filter((result) => result.issues.length > 0);

  return issues;
};

const getCart = async (owner) => {
  const cart = await findOrCreateCart(owner);
  await syncCartWithProducts(cart);
  return normalizeCartResponse(cart);
};

const validateCart = async (owner) => {
  const cart = await findOrCreateCart(owner);
  const issues = await syncCartWithProducts(cart);

  return {
    canCheckout: issues.length === 0,
    issues,
    cart: normalizeCartResponse(cart),
  };
};

const mergeGuestCart = async ({ userId, guestToken }) => {
  if (!guestToken) {
    const error = new Error("guestToken is required");
    error.statusCode = 400;
    throw error;
  }

  const userOwner = { ownerType: "user", userId };
  const userCart = await findOrCreateCart(userOwner);

  const guestCart = await Cart.findOne({
    ownerType: "guest",
    guestToken,
  });

  if (!guestCart || guestCart.items.length === 0) {
    return normalizeCartResponse(userCart);
  }

  for (const guestItem of guestCart.items) {
    const matchedItem = userCart.items.find(
      (userItem) => userItem.productId.toString() === guestItem.productId.toString()
    );

    if (matchedItem) {
      matchedItem.quantity += guestItem.quantity;
      matchedItem.priceAtAdd = guestItem.priceAtAdd;
      matchedItem.productName = guestItem.productName;
      matchedItem.imageUrl = guestItem.imageUrl;
      matchedItem.lastValidatedAt = guestItem.lastValidatedAt;
      matchedItem.flags = guestItem.flags;
    } else {
      userCart.items.push({
        productId: guestItem.productId,
        quantity: guestItem.quantity,
        priceAtAdd: guestItem.priceAtAdd,
        productName: guestItem.productName,
        imageUrl: guestItem.imageUrl,
        lastValidatedAt: guestItem.lastValidatedAt,
        flags: guestItem.flags,
      });
    }
  }

  recalculateTotals(userCart);
  await userCart.save();
  await Cart.deleteOne({ _id: guestCart._id });

  return normalizeCartResponse(userCart);
};

const checkoutSelectedItems = async ({ userId, productIds }) => {
  ensureValidObjectId(userId, "Invalid user id");
  productIds.forEach((productId) => ensureValidObjectId(productId));

  const cart = await findOrCreateCart({ ownerType: "user", userId });
  await syncCartWithProducts(cart);

  const selectedIds = new Set(productIds.map((id) => id.toString()));
  const selectedItems = cart.items.filter((item) =>
    selectedIds.has(item.productId.toString())
  );

  if (selectedItems.length !== selectedIds.size) {
    const foundIds = new Set(selectedItems.map((item) => item.productId.toString()));
    const missingIds = [...selectedIds].filter((id) => !foundIds.has(id));
    const error = new Error(`Selected cart items not found: ${missingIds.join(", ")}`);
    error.statusCode = 404;
    throw error;
  }

  const invalidItems = selectedItems.filter(
    (item) =>
      item.flags?.priceChanged ||
      item.flags?.outOfStock ||
      item.flags?.inactiveProduct
  );

  if (invalidItems.length > 0) {
    const error = new Error("Selected cart items need attention before checkout");
    error.statusCode = 409;
    error.details = invalidItems.map((item) => ({
      productId: item.productId.toString(),
      flags: item.flags,
    }));
    throw error;
  }

  const checkoutItems = selectedItems.map(normalizeCheckoutItem);
  cart.items = cart.items.filter((item) => !selectedIds.has(item.productId.toString()));
  recalculateTotals(cart);
  await cart.save();

  return {
    items: checkoutItems,
    cart: normalizeCartResponse(cart),
  };
};

const restoreCheckoutItems = async ({ userId, items, sourceOrderId }) => {
  ensureValidObjectId(userId, "Invalid user id");
  if (sourceOrderId) {
    ensureValidObjectId(sourceOrderId, "Invalid source order id");
  }
  items.forEach((item) => ensureValidObjectId(item.productId));

  const cart = await findOrCreateCart({ ownerType: "user", userId });
  const restoredOrderIds = cart.restoredOrderIds || [];
  const alreadyRestored =
    sourceOrderId &&
    restoredOrderIds.some((orderId) => orderId.toString() === sourceOrderId);

  if (alreadyRestored) {
    return {
      alreadyRestored: true,
      cart: normalizeCartResponse(cart),
    };
  }

  for (const restoredItem of items) {
    const priceAtAdd = Number(restoredItem.priceAtAdd ?? restoredItem.price);
    const productName = restoredItem.productName || restoredItem.name;
    const existedItem = cart.items.find(
      (item) => item.productId.toString() === restoredItem.productId
    );

    if (existedItem) {
      existedItem.quantity += restoredItem.quantity;
      existedItem.priceAtAdd = priceAtAdd;
      existedItem.productName = productName;
      existedItem.imageUrl = restoredItem.imageUrl || "";
      existedItem.lastValidatedAt = restoredItem.lastValidatedAt || null;
      existedItem.flags = restoredItem.flags || {
        priceChanged: false,
        outOfStock: false,
        inactiveProduct: false,
      };
    } else {
      cart.items.push({
        productId: restoredItem.productId,
        quantity: restoredItem.quantity,
        priceAtAdd,
        productName,
        imageUrl: restoredItem.imageUrl || "",
        lastValidatedAt: restoredItem.lastValidatedAt || null,
        flags: restoredItem.flags || {
          priceChanged: false,
          outOfStock: false,
          inactiveProduct: false,
        },
      });
    }
  }

  if (sourceOrderId) {
    cart.restoredOrderIds.push(toObjectId(sourceOrderId));
  }
  recalculateTotals(cart);
  await cart.save();

  return {
    alreadyRestored: false,
    cart: normalizeCartResponse(cart),
  };
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  validateCart,
  mergeGuestCart,
  checkoutSelectedItems,
  restoreCheckoutItems,
};
