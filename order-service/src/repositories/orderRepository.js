const Order = require("../models/Order");
const OrderStatusHistory = require("../models/OrderStatusHistory");

const create = (payload) => Order.create(payload);

const findByUserId = (userId) => Order.find({ userId }).sort({ createdAt: -1 }).lean();

const findById = (orderId) => Order.findById(orderId).lean();

const findByIdForUpdate = (orderId) => Order.findById(orderId).select("+processedEventIds");

const findAll = ({ status, orderStatus, paymentStatus, page, limit }) => {
  const filter = {};

  if (status) filter.status = status;
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const skip = (page - 1) * limit;

  return Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
};

const findWaitingForProcessing = ({ page, limit }) => {
  const skip = (page - 1) * limit;
  const filter = {
    paymentStatus: "PAID",
    orderStatus: "WAITING_FOR_PROCESSING",
  };

  return Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
};

const createStatusHistory = (payload) => OrderStatusHistory.create(payload);

const findStatusHistory = (orderId) =>
  OrderStatusHistory.find({ orderId }).sort({ createdAt: 1 }).lean();

module.exports = {
  create,
  findByUserId,
  findById,
  findByIdForUpdate,
  findAll,
  findWaitingForProcessing,
  createStatusHistory,
  findStatusHistory,
};
