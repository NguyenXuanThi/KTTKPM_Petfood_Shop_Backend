const Wishlist = require("../models/Wishlist");

const findByUserId = async (userId) => Wishlist.findOne({ userId });

const findOrCreateByUserId = async (userId) =>
  Wishlist.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        productIds: [],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

const hasProduct = async (userId, productId) =>
  Boolean(await Wishlist.exists({ userId, productIds: productId }));

const addProduct = async (userId, productId) => {
  // Ensure document exists first, then add product
  await Wishlist.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, productIds: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return Wishlist.findOneAndUpdate(
    { userId },
    { $addToSet: { productIds: productId } },
    { new: true },
  );
};

const removeProduct = async (userId, productId) => {
  // Ensure document exists first, then remove product
  await Wishlist.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, productIds: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return Wishlist.findOneAndUpdate(
    { userId },
    { $pull: { productIds: productId } },
    { new: true },
  );
};

module.exports = {
  findByUserId,
  findOrCreateByUserId,
  hasProduct,
  addProduct,
  removeProduct,
};