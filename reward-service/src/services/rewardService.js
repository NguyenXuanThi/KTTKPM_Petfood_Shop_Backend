const UserReward = require("../models/UserReward");
const RewardPool = require("../models/RewardPool");
const SpinHistory = require("../models/SpinHistory");
const RewardOrder = require("../models/RewardOrder");
const RewardShopItem = require("../models/RewardShopItem");
const { assignCoupon, getCouponsByIds } = require("../clients/couponClient");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const calculateSpinCount = (paidAmount) => {
  if (paidAmount >= 1000000) return 3;
  if (paidAmount >= 500000) return 2;
  return 1;
};

const getOrCreateUserReward = async (userId) =>
  UserReward.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

const grantSpins = async ({ userId, orderId, paidAmount }) => {
  const spins = calculateSpinCount(Number(paidAmount));

  const existing = await RewardOrder.findOne({ userId, orderId });
  if (existing) {
    return { rewardOrder: existing, alreadyGranted: true };
  }

  let rewardOrder;
  try {
    rewardOrder = await RewardOrder.create({
      userId,
      orderId,
      orderAmount: paidAmount,
      spinsGranted: spins,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await RewardOrder.findOne({ userId, orderId });
      return { rewardOrder: duplicate, alreadyGranted: true };
    }
    throw error;
  }

  const userReward = await UserReward.findOneAndUpdate(
    { userId },
    {
      $inc: { spinBalance: spins, totalSpinsEarned: spins },
      $setOnInsert: { userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { rewardOrder, userReward, alreadyGranted: false };
};

const getMe = async (userId) => getOrCreateUserReward(userId);

const getWheel = async () => {
  const rewards = await RewardPool.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  return rewards;
};

const attachCouponDetails = async (items = []) => {
  const couponIds = items.map((item) => item.couponId).filter(Boolean);
  const coupons = await getCouponsByIds(couponIds);
  const couponMap = new Map(coupons.map((coupon) => [coupon._id.toString(), coupon]));

  return items.map((item) => ({
    ...item,
    coupon: couponMap.get(item.couponId?.toString()) || null,
  }));
};

const pickWeightedReward = (rewards) => {
  const weightedRewards = rewards
    .map((reward, index) => ({ reward, index }))
    .filter(({ reward }) => reward.isActive && reward.probability > 0);
  const totalProbability = weightedRewards.reduce((sum, { reward }) => sum + Number(reward.probability || 0), 0);

  if (!weightedRewards.length) throw createError("Reward pool is not configured", 400);
  if (Math.round(totalProbability * 100) / 100 !== 100) {
    throw createError("Active reward probability total must be exactly 100", 400);
  }

  const random = Math.random() * totalProbability;
  let accumulated = 0;
  for (const weightedReward of weightedRewards) {
    const { reward } = weightedReward;
    accumulated += Number(reward.probability || 0);
    if (random <= accumulated) return weightedReward;
  }
  return weightedRewards[weightedRewards.length - 1];
};

const spin = async (userId) => {
  const rewards = await getWheel();
  const { reward, index: rewardIndex } = pickWeightedReward(rewards);

  const userReward = await UserReward.findOneAndUpdate(
    { userId, spinBalance: { $gt: 0 } },
    { $inc: { spinBalance: -1, totalSpinsUsed: 1 } },
    { new: true },
  );

  if (!userReward) throw createError("No spins available", 400);

  try {
    if (reward.type === "coin") {
      userReward.coinBalance += reward.coinAmount;
      await userReward.save();
    } else {
      await assignCoupon({ userId, couponId: reward.couponId, source: "lucky_spin" });
    }
  } catch (error) {
    await UserReward.updateOne(
      { userId },
      { $inc: { spinBalance: 1, totalSpinsUsed: -1 } },
    );
    throw error;
  }

  await SpinHistory.create({
    userId,
    rewardType: reward.type,
    rewardLabel: reward.label,
    coinAmount: reward.type === "coin" ? reward.coinAmount : 0,
    couponId: reward.type === "coupon" ? reward.couponId : null,
  });

  return {
    reward: {
      rewardPoolId: reward._id,
      rewardIndex,
      type: reward.type,
      label: reward.label,
      coinAmount: reward.type === "coin" ? reward.coinAmount : 0,
      couponId: reward.type === "coupon" ? reward.couponId : null,
    },
    spin: {
      remainingSpins: userReward.spinBalance,
      coinBalance: userReward.coinBalance,
    },
  };
};

const getShop = async () => {
  const items = await RewardShopItem.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  return attachCouponDetails(items);
};

const getSpinHistory = (userId) =>
  SpinHistory.find({ userId }).sort({ playedAt: -1, createdAt: -1 }).limit(100).lean();

const exchangeShopItem = async ({ userId, itemId }) => {
  const item = await RewardShopItem.findOne({ _id: itemId, isActive: true });
  if (!item) throw createError("Reward shop item not found", 404);

  const userReward = await UserReward.findOneAndUpdate(
    { userId, coinBalance: { $gte: item.coinCost } },
    { $inc: { coinBalance: -item.coinCost } },
    { new: true },
  );

  if (!userReward) throw createError("Not enough coins", 400);

  try {
    const assignment = await assignCoupon({
      userId,
      couponId: item.couponId,
      source: "coin_exchange",
    });

    const [hydratedItem] = await attachCouponDetails([item.toObject()]);
    return { item: hydratedItem, assignment, coinBalance: userReward.coinBalance };
  } catch (error) {
    await UserReward.updateOne({ userId }, { $inc: { coinBalance: item.coinCost } });
    throw error;
  }
};

module.exports = {
  grantSpins,
  getMe,
  getWheel,
  spin,
  getShop,
  getSpinHistory,
  exchangeShopItem,
  calculateSpinCount,
  attachCouponDetails,
};
