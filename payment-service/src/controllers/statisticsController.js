const statisticsService = require("../services/statisticsService");

const getPaymentStatistics = async (req, res, next) => {
  try {
    const data = await statisticsService.getPaymentStatistics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPaymentStatistics };
