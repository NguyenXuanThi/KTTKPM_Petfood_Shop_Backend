const mongoose = require("mongoose");
const userRepository = require("../repositories/userRepository");
const wishlistRepository = require("../repositories/wishlistRepository");
const { getProductById } = require("./productClient");

const ensureObjectId = (id, message) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const ensureActiveUser = async (userId) => {
  ensureObjectId(userId, "Invalid user id");

  const user = await userRepository.findById(userId);

  if (!user || !user.isActive) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const formatWishlistDoc = (wishlist) => {
  if (!wishlist) {
    return {
      userId: null,
      productIds: [],
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: wishlist._id?.toString?.() || null,
    userId: wishlist.userId?.toString?.() || wishlist.userId,
    productIds: (wishlist.productIds || []).map((productId) => productId.toString()),
    createdAt: wishlist.createdAt || null,
    updatedAt: wishlist.updatedAt || null,
  };
};

const hydrateWishlistItems = async (productIds) => {
  const settledResults = await Promise.allSettled(
    productIds.map((productId) => getProductById(productId)),
  );

  return settledResults.reduce((items, result, index) => {
    if (result.status === "fulfilled") {
      items.push({
        productId: productIds[index],
        product: result.value,
      });
    }
    // Skip 404 (deleted products) and failed fetches silently
    return items;
  }, []);
};

const getWishlist = async (userId) => {
  await ensureActiveUser(userId);

  const wishlist = await wishlistRepository.findOrCreateByUserId(userId);
  const formattedWishlist = formatWishlistDoc(wishlist);
  const items = await hydrateWishlistItems(formattedWishlist.productIds);

  return {
    ...formattedWishlist,
    items,
    total: items.length,
  };
};

const addToWishlist = async (userId, productId) => {
  await ensureActiveUser(userId);
  ensureObjectId(productId, "Invalid product id");

  const alreadyFavorited = await wishlistRepository.hasProduct(userId, productId);

  if (alreadyFavorited) {
    const wishlist = await wishlistRepository.findOrCreateByUserId(userId);
    return {
      alreadyFavorited: true,
      wishlist: formatWishlistDoc(wishlist),
    };
  }

  const wishlist = await wishlistRepository.addProduct(userId, productId);

  return {
    alreadyFavorited: false,
    wishlist: formatWishlistDoc(wishlist),
  };
};

const removeFromWishlist = async (userId, productId) => {
  await ensureActiveUser(userId);
  ensureObjectId(productId, "Invalid product id");

  const existed = await wishlistRepository.hasProduct(userId, productId);
  const wishlist = await wishlistRepository.removeProduct(userId, productId);

  return {
    removed: existed,
    wishlist: formatWishlistDoc(wishlist),
  };
};

const isProductFavorited = async (userId, productId) => {
  await ensureActiveUser(userId);
  ensureObjectId(productId, "Invalid product id");

  const isFavorited = await wishlistRepository.hasProduct(userId, productId);

  return {
    userId,
    productId,
    isFavorited,
  };
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isProductFavorited,
};