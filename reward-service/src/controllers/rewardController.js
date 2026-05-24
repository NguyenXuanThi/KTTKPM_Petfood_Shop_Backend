const rewardService = require("../services/rewardService");
const { idParamSchema } = require("../validators/rewardValidator");

const getMe = async (req, res, next) => {
  try {
    const reward = await rewardService.getMe(req.auth.sub);
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const getWheel = async (req, res, next) => {
  try {
    const rewards = await rewardService.getWheel();
    return res.status(200).json({ success: true, rewards });
  } catch (error) {
    return next(error);
  }
};

const spin = async (req, res, next) => {
  try {
    const result = await rewardService.spin(req.auth.sub);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const getShop = async (req, res, next) => {
  try {
    const items = await rewardService.getShop();
    return res.status(200).json({ success: true, items });
  } catch (error) {
    return next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await rewardService.getSpinHistory(req.auth.sub);
    return res.status(200).json({ success: true, history });
  } catch (error) {
    return next(error);
  }
};

const exchange = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const result = await rewardService.exchangeShopItem({ userId: req.auth.sub, itemId: id });
    return res.status(200).json({ success: true, message: "Coupon exchanged successfully", ...result });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMe, getWheel, spin, getShop, getHistory, exchange };
