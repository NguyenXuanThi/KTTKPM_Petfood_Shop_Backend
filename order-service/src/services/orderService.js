const mongoose = require("mongoose");
const orderRepository = require("../repositories/orderRepository");

const legacyStatusByOrderStatus = {
  PENDING_PAYMENT: "pending",
  PAID: "processing",
  WAITING_FOR_PROCESSING: "processing",
  PROCESSING: "processing",
  WAITING_FOR_DELIVERY: "shipped",
  DELIVERING: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  FAILED: "cancelled",
  REFUNDED: "cancelled",
};

const legacyPaymentStatusByPaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const allowedTransitions = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "FAILED"],
  PAID: ["WAITING_FOR_PROCESSING", "REFUNDED"],
  WAITING_FOR_PROCESSING: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["WAITING_FOR_DELIVERY", "CANCELLED", "REFUNDED"],
  WAITING_FOR_DELIVERY: ["DELIVERING", "CANCELLED"],
  DELIVERING: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  FAILED: [],
  REFUNDED: [],
};

const ensureObjectId = (id, message = "Invalid order id") => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const normalizeItem = (item) => ({
  productId: item.productId,
  name: item.name,
  price: Number(item.price),
  quantity: Number(item.quantity),
  imageUrl: item.imageUrl || "",
});

const calculateTotalAmount = (items) =>
  items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

const toClientOrder = (order) => {
  if (!order) return order;

  const object = typeof order.toObject === "function" ? order.toObject() : { ...order };
  const orderStatus = object.orderStatus || "PENDING_PAYMENT";
  const paymentStatus =
    object.paymentStatus && object.paymentStatus === object.paymentStatus.toUpperCase()
      ? object.paymentStatus
      : String(object.paymentStatus || "pending").toUpperCase();

  return {
    ...object,
    orderStatus,
    paymentStatus,
    status: object.status || legacyStatusByOrderStatus[orderStatus] || "pending",
    paymentStatusLabel: legacyPaymentStatusByPaymentStatus[paymentStatus] || "pending",
  };
};

const assertTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return;

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    const error = new Error(`Cannot change order from ${currentStatus} to ${nextStatus}`);
    error.statusCode = 409;
    throw error;
  }
};

const recordStatusHistory = async ({ order, fromStatus, toStatus, changedBy, reason = "" }) => {
  if (fromStatus === toStatus) return;

  await orderRepository.createStatusHistory({
    orderId: order._id,
    fromStatus,
    toStatus,
    changedBy,
    reason,
  });
};

const createOrder = async (userId, payload) => {
  ensureObjectId(userId, "Invalid user id");

  const items = payload.items.map(normalizeItem);
  const order = await orderRepository.create({
    userId,
    items,
    shippingAddress: payload.shippingAddress,
    paymentMethod: payload.paymentMethod,
    paymentStatus: "PENDING",
    orderStatus: "PENDING_PAYMENT",
    status: "pending",
    totalAmount: calculateTotalAmount(items),
  });

  return toClientOrder(order);
};

const getMyOrders = async (userId) => {
  ensureObjectId(userId, "Invalid user id");
  const orders = await orderRepository.findByUserId(userId);
  return orders.map(toClientOrder);
};

const getOrder = async (orderId, auth) => {
  ensureObjectId(orderId);

  const order = await orderRepository.findById(orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = order.userId.toString() === auth.sub;
  const isAdmin = auth.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to view this order");
    error.statusCode = 403;
    throw error;
  }

  return toClientOrder(order);
};

const listOrders = async ({ status, orderStatus, paymentStatus, page, limit }) => {
  const [orders, total] = await orderRepository.findAll({
    status,
    orderStatus,
    paymentStatus,
    page,
    limit,
  });

  return {
    orders: orders.map(toClientOrder),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const listWaitingForProcessing = async ({ page, limit }) => {
  const [orders, total] = await orderRepository.findWaitingForProcessing({ page, limit });

  return {
    orders: orders.map(toClientOrder),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const updateDeliveryTime = async (orderId, adminId, deliveryEstimatedTime) => {
  ensureObjectId(orderId);

  const order = await orderRepository.findByIdForUpdate(orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (order.paymentStatus !== "PAID") {
    const error = new Error("Only paid orders can have delivery time");
    error.statusCode = 409;
    throw error;
  }

  const nextDate = new Date(deliveryEstimatedTime);
  if (Number.isNaN(nextDate.getTime()) || nextDate <= new Date()) {
    const error = new Error("Delivery time must be in the future");
    error.statusCode = 400;
    throw error;
  }

  order.deliveryEstimatedTime = nextDate;
  await order.save();

  return toClientOrder(order);
};

const updateOrderStatus = async (orderId, payload, auth) => {
  ensureObjectId(orderId);

  const order = await orderRepository.findByIdForUpdate(orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = order.orderStatus || "PENDING_PAYMENT";
  const nextStatus = payload.orderStatus;

  assertTransition(currentStatus, nextStatus);

  order.orderStatus = nextStatus;
  order.status = legacyStatusByOrderStatus[nextStatus] || order.status;

  if (nextStatus === "DELIVERED" && !order.deliveredAt) {
    order.deliveredAt = new Date();
    order.deliveryPopupSeen = false;
  }

  await order.save();

  await recordStatusHistory({
    order,
    fromStatus: currentStatus,
    toStatus: nextStatus,
    changedBy: auth?.sub || "system",
    reason: payload.reason,
  });

  return toClientOrder(order);
};

const handlePaymentSucceeded = async (event) => {
  ensureObjectId(event.orderId);
  ensureObjectId(event.paymentId, "Invalid payment id");

  const order = await orderRepository.findByIdForUpdate(event.orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (order.processedEventIds?.includes(event.eventId)) {
    return toClientOrder(order);
  }

  const fromStatus = order.orderStatus || "PENDING_PAYMENT";

  order.paymentId = event.paymentId;
  order.paymentStatus = "PAID";
  order.orderStatus = "WAITING_FOR_PROCESSING";
  order.status = "processing";
  order.processedEventIds = [...(order.processedEventIds || []), event.eventId];

  await order.save();

  await recordStatusHistory({
    order,
    fromStatus,
    toStatus: "WAITING_FOR_PROCESSING",
    changedBy: "payment-service",
    reason: "PaymentSucceeded",
  });

  return toClientOrder(order);
};

const markDeliveryPopupSeen = async (orderId, userId) => {
  ensureObjectId(orderId);
  ensureObjectId(userId, "Invalid user id");

  const order = await orderRepository.findByIdForUpdate(orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (order.userId.toString() !== userId) {
    const error = new Error("You do not have permission to update this order");
    error.statusCode = 403;
    throw error;
  }

  order.deliveryPopupSeen = true;
  await order.save();

  return toClientOrder(order);
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  listOrders,
  listWaitingForProcessing,
  updateDeliveryTime,
  updateOrderStatus,
  handlePaymentSucceeded,
  markDeliveryPopupSeen,
};
