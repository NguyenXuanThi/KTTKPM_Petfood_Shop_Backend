const {
  orderServiceUrl,
  productServiceUrl,
  paymentServiceUrl,
  userServiceUrl,
} = require("../config/env");

const fetchJson = async (url, req) => {
  const response = await fetch(url, {
    headers: {
      Authorization: req.headers.authorization || "",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Statistics request failed");
    error.statusCode = response.status;
    throw error;
  }
  return data.data;
};

const appendQuery = (url, queryString) => (queryString ? `${url}?${queryString}` : url);

const getProductStatistics = async (req, res, next) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const [salesData, inventoryData] = await Promise.all([
      fetchJson(
        appendQuery(`${orderServiceUrl}/api/admin/statistics/products`, queryString),
        req,
      ),
      fetchJson(`${productServiceUrl}/api/products/admin/statistics/products`, req),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: inventoryData.summary.totalProducts,
          lowStockProducts: inventoryData.summary.lowStockProducts,
        },
        topSellingProducts: salesData.topSellingProducts || [],
        lowStockList: inventoryData.lowStockList || [],
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboardStatistics = async (req, res, next) => {
  try {
    const queryString = new URLSearchParams({ range: "today" }).toString();
    const [orderDashboard, paymentStats, userStats] = await Promise.all([
      fetchJson(`${orderServiceUrl}/api/admin/statistics/dashboard`, req),
      fetchJson(appendQuery(`${paymentServiceUrl}/api/admin/statistics/payments`, queryString), req),
      fetchJson(appendQuery(`${userServiceUrl}/api/users/admin/statistics/users`, queryString), req),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...orderDashboard,
        waitingVerifyPayments: paymentStats.summary.waitingVerifyPayments,
        newUsers: userStats.summary.newUsers,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProductStatistics,
  getDashboardStatistics,
};
