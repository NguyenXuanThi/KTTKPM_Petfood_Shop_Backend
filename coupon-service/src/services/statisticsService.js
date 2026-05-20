const UserCoupon = require("../models/UserCoupon");
const { getDateRange } = require("../utils/dateRange");

const getCouponStatistics = async (query) => {
  const { start, end } = getDateRange(query);

  const rows = await UserCoupon.aggregate([
    {
      $match: {
        status: "used",
        usedAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$couponId",
        usedCount: { $sum: 1 },
        totalDiscountAmount: { $sum: { $ifNull: ["$discountAmount", 0] } },
      },
    },
    {
      $lookup: {
        from: "coupons",
        localField: "_id",
        foreignField: "_id",
        as: "coupon",
      },
    },
    { $unwind: "$coupon" },
    { $sort: { usedCount: -1, totalDiscountAmount: -1 } },
  ]);

  const couponsUsed = rows.reduce((sum, row) => sum + row.usedCount, 0);
  const totalDiscountAmount = rows.reduce(
    (sum, row) => sum + row.totalDiscountAmount,
    0,
  );

  return {
    summary: {
      couponsUsed,
      totalDiscountAmount,
      mostUsedCoupon: rows[0]?.coupon?.code || null,
    },
    chart: rows.slice(0, 10).map((row) => ({
      code: row.coupon.code,
      usedCount: row.usedCount,
      totalDiscountAmount: row.totalDiscountAmount,
    })),
    table: rows.map((row) => ({
      couponId: row._id,
      code: row.coupon.code,
      scope: row.coupon.scope,
      usedCount: row.usedCount,
      totalDiscountAmount: row.totalDiscountAmount,
      expiresAt: row.coupon.expiresAt,
      isActive: row.coupon.isActive,
    })),
  };
};

module.exports = { getCouponStatistics };
