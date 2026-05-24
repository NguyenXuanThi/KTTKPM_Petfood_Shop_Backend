const adminRewardService = require("../services/adminRewardService");
const {
  idParamSchema,
  rewardPoolSchema,
  rewardPoolUpdateSchema,
  shopItemSchema,
  shopItemUpdateSchema,
} = require("../validators/rewardValidator");

const validateBody = (schema, body) => schema.validateAsync(body, { abortEarly: false, stripUnknown: true, convert: true });

const listPool = async (req, res, next) => {
  try {
    const rewards = await adminRewardService.listPool();
    return res.status(200).json({ success: true, rewards });
  } catch (error) {
    return next(error);
  }
};

const createPoolItem = async (req, res, next) => {
  try {
    const payload = await validateBody(rewardPoolSchema, req.body);
    const reward = await adminRewardService.createPoolItem(payload);
    return res.status(201).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const updatePoolItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await validateBody(rewardPoolUpdateSchema, req.body);
    const reward = await adminRewardService.updatePoolItem(id, payload);
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const enablePoolItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const reward = await adminRewardService.setPoolEnabled(id, true);
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const disablePoolItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const reward = await adminRewardService.setPoolEnabled(id, false);
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const deletePoolItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const reward = await adminRewardService.deletePoolItem(id);
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return next(error);
  }
};

const listShop = async (req, res, next) => {
  try {
    const items = await adminRewardService.listShop();
    return res.status(200).json({ success: true, items });
  } catch (error) {
    return next(error);
  }
};

const createShopItem = async (req, res, next) => {
  try {
    const payload = await validateBody(shopItemSchema, req.body);
    const item = await adminRewardService.createShopItem(payload);
    return res.status(201).json({ success: true, item });
  } catch (error) {
    return next(error);
  }
};

const updateShopItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await validateBody(shopItemUpdateSchema, req.body);
    const item = await adminRewardService.updateShopItem(id, payload);
    return res.status(200).json({ success: true, item });
  } catch (error) {
    return next(error);
  }
};

const enableShopItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const item = await adminRewardService.setShopEnabled(id, true);
    return res.status(200).json({ success: true, item });
  } catch (error) {
    return next(error);
  }
};

const disableShopItem = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const item = await adminRewardService.setShopEnabled(id, false);
    return res.status(200).json({ success: true, item });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPool,
  createPoolItem,
  updatePoolItem,
  enablePoolItem,
  disablePoolItem,
  deletePoolItem,
  listShop,
  createShopItem,
  updateShopItem,
  enableShopItem,
  disableShopItem,
};
