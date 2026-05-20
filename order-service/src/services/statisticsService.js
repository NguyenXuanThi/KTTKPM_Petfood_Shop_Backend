const { Order } = require("../models/Order");
const { getDateRange, mongoDateFormat } = require("../utils/dateRange");

const statusList = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
];

const getRevenueStatistics = async (query) => {
  const { start, end, groupBy } = getDateRange(query);
  const dateFormat = mongoDateFormat(groupBy);

  const [summaryRows, chartRows, tableRows] = await Promise.all([
    Order.aggregate([
      {
        $addFields: {
          revenueDate: { $ifNull: ["$paidAt", "$updatedAt"] },
        },
      },
      {
        $match: {
          paymentStatus: "paid",
          orderStatus: { $ne: "cancelled" },
          revenueDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          paidRevenue: { $sum: "$totalAmount" },
          paidOrders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $addFields: {
          revenueDate: { $ifNull: ["$paidAt", "$updatedAt"] },
        },
      },
      {
        $match: {
          paymentStatus: "paid",
          orderStatus: { $ne: "cancelled" },
          revenueDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$revenueDate" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      {
        $addFields: {
          revenueDate: { $ifNull: ["$paidAt", "$updatedAt"] },
        },
      },
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          paidOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "paid"] },
                    { $ne: ["$orderStatus", "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "paid"] },
                    { $ne: ["$orderStatus", "cancelled"] },
                    { $gte: ["$revenueDate", start] },
                    { $lte: ["$revenueDate", end] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const summary = summaryRows[0] || { paidRevenue: 0, paidOrders: 0 };
  const paidRevenue = summary.paidRevenue || 0;
  const paidOrders = summary.paidOrders || 0;

  return {
    summary: {
      totalRevenue: paidRevenue,
      paidRevenue,
      averageOrderValue: paidOrders ? Math.round(paidRevenue / paidOrders) : 0,
      paidOrders,
    },
    chart: chartRows.map((row) => ({
      label: row._id,
      revenue: row.revenue,
      orders: row.orders,
    })),
    table: tableRows.map((row) => ({
      date: row._id,
      totalOrders: row.totalOrders,
      paidOrders: row.paidOrders,
      revenue: row.revenue,
    })),
  };
};

const getOrderStatistics = async (query) => {
  const { start, end } = getDateRange(query);

  const [statusRows, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]),
    Order.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id userId totalAmount paymentMethod paymentStatus orderStatus createdAt")
      .lean(),
  ]);

  const counts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));

  return {
    summary: {
      totalOrders: statusRows.reduce((sum, row) => sum + row.count, 0),
      pendingOrders: counts.pending || 0,
      confirmedOrders: counts.confirmed || 0,
      shippingOrders: counts.shipping || 0,
      deliveredOrders: counts.delivered || 0,
      completedOrders: counts.completed || 0,
      cancelledOrders: counts.cancelled || 0,
    },
    chart: statusList.map((status) => ({ status, count: counts[status] || 0 })),
    recentOrders: recentOrders.map((order) => ({
      orderId: order._id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
    })),
  };
};

const getProductStatistics = async (query) => {
  const { start, end } = getDateRange(query);

  const topSellingProducts = await Order.aggregate([
    {
      $addFields: {
        revenueDate: { $ifNull: ["$paidAt", "$updatedAt"] },
      },
    },
    {
      $match: {
        paymentStatus: "paid",
        orderStatus: { $in: ["completed", "delivered", "shipping", "confirmed"] },
        revenueDate: { $gte: start, $lte: end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.name" },
        imageUrl: { $first: "$items.imageUrl" },
        soldQuantity: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { soldQuantity: -1, revenue: -1 } },
    { $limit: 10 },
  ]);

  return {
    summary: {
      totalProducts: 0,
      lowStockProducts: 0,
    },
    topSellingProducts: topSellingProducts.map((item) => ({
      productId: item._id,
      name: item.name,
      imageUrl: item.imageUrl,
      soldQuantity: item.soldQuantity,
      revenue: item.revenue,
    })),
    lowStockList: [],
  };
};

const getDashboardStatistics = async () => {
  const { start, end } = getDateRange({ range: "today" });
  const [revenueRows, pendingOrders] = await Promise.all([
    Order.aggregate([
      {
        $addFields: {
          revenueDate: { $ifNull: ["$paidAt", "$updatedAt"] },
        },
      },
      {
        $match: {
          paymentStatus: "paid",
          orderStatus: { $ne: "cancelled" },
          revenueDate: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ orderStatus: "pending" }),
  ]);

  return {
    revenueToday: revenueRows[0]?.revenue || 0,
    pendingOrders,
    quickLinks: [
      "/admin/orders",
      "/admin/orders/pending",
      "/admin/payments/banking",
      "/admin/coupons",
    ],
  };
};

module.exports = {
  getRevenueStatistics,
  getOrderStatistics,
  getProductStatistics,
  getDashboardStatistics,
};
