const rewardService = require("../services/rewardService");
const { grantSpinsSchema } = require("../validators/rewardValidator");

const grantSpins = async (req, res, next) => {
  try {
    const payload = await grantSpinsSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true, convert: true });
    const result = await rewardService.grantSpins(payload);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

module.exports = { grantSpins };
