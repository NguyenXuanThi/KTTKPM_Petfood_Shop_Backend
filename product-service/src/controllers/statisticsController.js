const statisticsService = require("../services/statisticsService");

const getProductStatistics = async (req, res, next) => {
  try {
    const data = await statisticsService.getProductStatistics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getProductStatistics };
