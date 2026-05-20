const statisticsService = require("../services/statisticsService");

const send = (res, data) => res.status(200).json({ success: true, data });

const getRevenueStatistics = async (req, res, next) => {
  try {
    return send(res, await statisticsService.getRevenueStatistics(req.query));
  } catch (error) {
    return next(error);
  }
};

const getOrderStatistics = async (req, res, next) => {
  try {
    return send(res, await statisticsService.getOrderStatistics(req.query));
  } catch (error) {
    return next(error);
  }
};

const getProductStatistics = async (req, res, next) => {
  try {
    return send(res, await statisticsService.getProductStatistics(req.query));
  } catch (error) {
    return next(error);
  }
};

const getDashboardStatistics = async (req, res, next) => {
  try {
    return send(res, await statisticsService.getDashboardStatistics(req.query));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRevenueStatistics,
  getOrderStatistics,
  getProductStatistics,
  getDashboardStatistics,
};
