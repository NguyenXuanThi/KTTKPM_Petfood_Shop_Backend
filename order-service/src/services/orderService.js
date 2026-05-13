const axios = require("axios");
const mongoose = require("mongoose");
const orderRepository = require("../repositories/orderRepository");
const {
  userServiceUrl,
  userInternalKey,
  userServiceTimeoutMs,
} = require("../config/env");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureObjectId = (id, message = "Invalid id") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(message, 400);
  }
};

const normalizeItem = (item) => ({
  productId: item.productId,
  name: item.name,
  imageUrl: item.imageUrl || "",
  quantity: Number(item.quantity),
  price: Number(item.price),
});

const calculateTotalAmount = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const ensureOrderOwnership = (order, auth) => {
  const isOwner = order.userId.toString() === auth.sub;
  const isAdmin = auth.role === "admin";
  if (!isOwner && !isAdmin) {
    throw createError("You do not have permission to view this order", 403);
  }
};

const fetchAddressSnapshot = async ({ userId, addressId }) => {
  try {
    const { data } = await axios.get(
      `${userServiceUrl}/users/addresses/${addressId}/internal`,
      {
        timeout: userServiceTimeoutMs,
        headers: {
          "x-internal-key": userInternalKey,
        },
        params: { userId },
      },
    );

    return data.shippingAddress;
  } catch (error) {
    console.error("[order-service] fetchAddressSnapshot failed:", {
      url: `${userServiceUrl}/users/addresses/${addressId}/internal`,
      userId,
      addressId,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to fetch address from user-service",
        error.response.status,
      );
    }
    throw createError("user-service is unavailable", 502);
  }
};

const createOrder = async (userId, payload) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(payload.addressId, "Invalid address id");

  const items = payload.items.map(normalizeItem);
  const totalAmount = calculateTotalAmount(items);
  const paymentStatus = payload.paymentMethod === "cash" ? "unpaid" : "pending";

  const shippingAddress = await fetchAddressSnapshot({
    userId,
    addressId: payload.addressId,
  });

  const order = await orderRepository.create({
    userId,
    items,
    totalAmount,
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    orderStatus: "pending",
    shippingAddress,
    notes: payload.notes || "",
  });

  return order.toObject();
};

const getMyOrders = async (userId) => {
  ensureObjectId(userId, "Invalid user id");
  return orderRepository.findByUserId(userId);
};

const getMyShippingOrders = async (userId) => {
  ensureObjectId(userId, "Invalid user id");
  return orderRepository.findShippingByUserId(userId);
};

const getOrderById = async (orderId, auth) => {
  ensureObjectId(orderId, "Invalid order id");
  const order = await orderRepository.findById(orderId);
  if (!order) throw createError("Order not found", 404);
  ensureOrderOwnership(order, auth);
  return order;
};

const listAdminOrders = async ({ page, limit, orderStatus }) => {
  const [orders, total] = await orderRepository.findAll({ page, limit, orderStatus });
  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getOrderForUpdate = async (orderId) => {
  ensureObjectId(orderId, "Invalid order id");
  const order = await orderRepository.findByIdForUpdate(orderId);
  if (!order) throw createError("Order not found", 404);
  return order;
};

const confirmOrder = async (orderId) => {
  const order = await getOrderForUpdate(orderId);

  if (order.orderStatus !== "pending") {
    throw createError("Only pending orders can be confirmed", 400);
  }

  if (order.paymentMethod === "banking" && order.paymentStatus !== "paid") {
    throw createError("Banking order can only be confirmed after payment is paid", 400);
  }

  order.orderStatus = "confirmed";
  order.confirmedAt = new Date();
  await order.save();
  return order.toObject();
};

const markShipping = async (orderId, estimatedDeliveryAt) => {
  const order = await getOrderForUpdate(orderId);

  if (order.orderStatus !== "confirmed") {
    throw createError("Only confirmed orders can move to shipping", 400);
  }

  const estimateDate = new Date(estimatedDeliveryAt);
  if (Number.isNaN(estimateDate.getTime())) {
    throw createError("Invalid estimated delivery date", 400);
  }

  order.orderStatus = "shipping";
  order.shippingStartedAt = new Date();
  order.estimatedDeliveryAt = estimateDate;
  await order.save();
  return order.toObject();
};

const markDelivered = async (orderId) => {
  const order = await getOrderForUpdate(orderId);
  if (order.orderStatus !== "shipping") {
    throw createError("Only shipping orders can be marked delivered", 400);
  }

  order.orderStatus = "delivered";
  order.deliveredAt = new Date();
  await order.save();
  return order.toObject();
};

const markCompleted = async (orderId) => {
  const order = await getOrderForUpdate(orderId);
  if (order.orderStatus !== "delivered") {
    throw createError("Only delivered orders can be marked completed", 400);
  }

  order.orderStatus = "completed";
  order.completedAt = new Date();
  await order.save();
  return order.toObject();
};

const cancelOrder = async (orderId, reason = "") => {
  const order = await getOrderForUpdate(orderId);
  if (["completed", "cancelled"].includes(order.orderStatus)) {
    throw createError("Order cannot be cancelled in current status", 400);
  }

  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  if (reason) {
    order.notes = order.notes ? `${order.notes}\nCancel reason: ${reason}` : `Cancel reason: ${reason}`;
  }
  await order.save();
  return order.toObject();
};

const updateCodPaymentStatus = async (orderId, paymentStatus) => {
  const order = await getOrderForUpdate(orderId);
  if (order.paymentMethod !== "cash") {
    throw createError("This endpoint is for cash orders only", 400);
  }

  if (order.paymentStatus === "paid") {
    throw createError("Cash order payment is already paid", 400);
  }

  if (paymentStatus !== "paid") {
    throw createError("Cash payment status can only transition to paid", 400);
  }

  order.paymentStatus = "paid";
  await order.save();
  return order.toObject();
};

const updatePaymentStatusInternal = async (orderId, paymentStatus) => {
  const order = await getOrderForUpdate(orderId);

  if (order.paymentMethod !== "banking") {
    throw createError("Internal payment status update is for banking orders", 400);
  }

  order.paymentStatus = paymentStatus;
  await order.save();
  return order.toObject();
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyShippingOrders,
  getOrderById,
  listAdminOrders,
  confirmOrder,
  markShipping,
  markDelivered,
  markCompleted,
  cancelOrder,
  updateCodPaymentStatus,
  updatePaymentStatusInternal,
};
