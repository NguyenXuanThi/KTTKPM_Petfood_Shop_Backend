const statisticsService = require("../services/statisticsService");

const getUserStatistics = async (req, res, next) => {
  try {
    const data = await statisticsService.getUserStatistics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getUserStatistics };
