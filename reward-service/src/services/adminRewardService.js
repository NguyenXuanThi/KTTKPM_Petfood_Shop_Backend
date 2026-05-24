const RewardPool = require("../models/RewardPool");
const RewardShopItem = require("../models/RewardShopItem");
const { getCouponsByIds } = require("../clients/couponClient");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertActiveProbabilityNotExceeded = async (candidate = {}) => {
  if (candidate.isActive === false) return;
  const rewards = await RewardPool.find({ isActive: true, _id: { $ne: candidate._id || null } });
  const total = rewards.reduce((sum, reward) => sum + Number(reward.probability || 0), 0) + Number(candidate.probability || 0);
  if (total > 100) throw createError("Active reward probability total cannot exceed 100", 400);
};

const listPool = () => RewardPool.find().sort({ displayOrder: 1, createdAt: -1 });

const createPoolItem = async (payload) => {
  await assertActiveProbabilityNotExceeded(payload);
  return RewardPool.create(payload);
};

const updatePoolItem = async (id, payload) => {
  const current = await RewardPool.findById(id);
  if (!current) throw createError("Reward pool item not found", 404);
  const next = { ...current.toObject(), ...payload, _id: current._id };
  await assertActiveProbabilityNotExceeded(next);
  Object.assign(current, payload);
  await current.save();
  return current;
};

const setPoolEnabled = (id, isActive) => updatePoolItem(id, { isActive });

const deletePoolItem = async (id) => {
  const item = await RewardPool.findByIdAndDelete(id);
  if (!item) throw createError("Reward pool item not found", 404);
  return item;
};

const attachCouponDetails = async (items = []) => {
  const plainItems = items.map((item) => (typeof item.toObject === "function" ? item.toObject() : item));
  const couponIds = plainItems.map((item) => item.couponId).filter(Boolean);
  const coupons = await getCouponsByIds(couponIds);
  const couponMap = new Map(coupons.map((coupon) => [coupon._id.toString(), coupon]));

  return plainItems.map((item) => ({
    ...item,
    coupon: couponMap.get(item.couponId?.toString()) || null,
  }));
};

const listShop = async () => {
  const items = await RewardShopItem.find().sort({ displayOrder: 1, createdAt: -1 });
  return attachCouponDetails(items);
};

const createShopItem = async (payload) => {
  const item = await RewardShopItem.create(payload);
  const [hydratedItem] = await attachCouponDetails([item]);
  return hydratedItem;
};

const updateShopItem = async (id, payload) => {
  const item = await RewardShopItem.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!item) throw createError("Reward shop item not found", 404);
  const [hydratedItem] = await attachCouponDetails([item]);
  return hydratedItem;
};

const setShopEnabled = (id, isActive) => updateShopItem(id, { isActive });

module.exports = {
  listPool,
  createPoolItem,
  updatePoolItem,
  setPoolEnabled,
  deletePoolItem,
  listShop,
  createShopItem,
  updateShopItem,
  setShopEnabled,
};
