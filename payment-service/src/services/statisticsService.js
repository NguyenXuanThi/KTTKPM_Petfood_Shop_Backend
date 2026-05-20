const { Payment } = require("../models/Payment");
const { getDateRange } = require("../utils/dateRange");

const statuses = ["pending", "waiting_verify", "paid", "failed", "expired"];

const getPaymentStatistics = async (query) => {
  const { start, end } = getDateRange(query);
  const [statusRows, recentPayments] = await Promise.all([
    Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Payment.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id orderId userId paymentMethod status amount createdAt")
      .lean(),
  ]);

  const counts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));

  return {
    summary: {
      paidPayments: counts.paid || 0,
      waitingVerifyPayments: counts.waiting_verify || 0,
      pendingPayments: counts.pending || 0,
      failedPayments: counts.failed || 0,
      expiredPayments: counts.expired || 0,
    },
    chart: statuses.map((status) => ({ status, count: counts[status] || 0 })),
    recentPayments: recentPayments.map((payment) => ({
      paymentId: payment._id,
      orderId: payment.orderId,
      userId: payment.userId,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
    })),
  };
};

module.exports = { getPaymentStatistics };
