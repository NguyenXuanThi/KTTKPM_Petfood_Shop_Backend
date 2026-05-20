const User = require("../models/User");
const { getDateRange, mongoDateFormat } = require("../utils/dateRange");

const getUserStatistics = async (query) => {
  const { start, end, groupBy } = getDateRange(query);
  const dateFormat = mongoDateFormat(groupBy);

  const [newUsers, activeUsers, inactiveUsers, totalUsers, chartRows, recentUsers] =
    await Promise.all([
      User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      User.countDocuments({ isActive: true, lastLoginAt: { $gte: start, $lte: end } }),
      User.countDocuments({ isActive: false }),
      User.countDocuments(),
      User.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            newUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("_id fullName email role isActive createdAt lastLoginAt")
        .lean(),
    ]);

  return {
    summary: {
      newUsers,
      activeUsers,
      inactiveUsers,
      totalUsers,
    },
    chart: chartRows.map((row) => ({ label: row._id, newUsers: row.newUsers })),
    recentUsers: recentUsers.map((user) => ({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })),
  };
};

module.exports = { getUserStatistics };
