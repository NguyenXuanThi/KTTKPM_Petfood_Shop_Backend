const statisticsService = require("../services/statisticsService");

const getCouponStatistics = async (req, res, next) => {
  try {
    const data = await statisticsService.getCouponStatistics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getCouponStatistics };
