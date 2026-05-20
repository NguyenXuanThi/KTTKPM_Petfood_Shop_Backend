const { Order } = require("../models/Order");

const create = (payload) => Order.create(payload);

const findById = (orderId) => Order.findById(orderId).lean();

const findByIdForUpdate = (orderId) => Order.findById(orderId);

const findByUserId = (userId) =>
  Order.find({ userId }).sort({ createdAt: -1 }).lean();

const findShippingByUserId = (userId) =>
  Order.find({ userId, orderStatus: "shipping" }).sort({ createdAt: -1 }).lean();

const findAll = ({ orderStatus, page, limit }) => {
  const filter = orderStatus ? { orderStatus } : {};
  const skip = (page - 1) * limit;

  return Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
};

const findExpiredBankingCandidates = (now = new Date()) =>
  Order.find({
    paymentMethod: "banking",
    orderStatus: "pending",
    paymentStatus: { $in: ["pending", "waiting_verify"] },
    expiresAt: { $ne: null, $lte: now },
    cartRestoredAt: null,
  }).sort({ expiresAt: 1 });

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  findByUserId,
  findShippingByUserId,
  findAll,
  findExpiredBankingCandidates,
};
