const axios = require("axios");
const mongoose = require("mongoose");
const orderRepository = require("../repositories/orderRepository");
const {
  userServiceUrl,
  userInternalKey,
  userServiceTimeoutMs,
  paymentServiceUrl,
  paymentInternalKey,
  paymentServiceTimeoutMs,
  cartServiceUrl,
  cartInternalKey,
  cartServiceTimeoutMs,
  couponServiceUrl,
  couponInternalKey,
  couponServiceTimeoutMs,
  rewardServiceUrl,
  rewardInternalKey,
  rewardServiceTimeoutMs,
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

const normalizeCheckoutItem = (item) => ({
  productId: item.productId,
  name: item.productName,
  imageUrl: item.imageUrl || "",
  quantity: Number(item.quantity),
  price: Number(item.priceAtAdd),
});

const calculateTotalAmount = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const bankingExpiryDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const BASE_SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;

const calculateShipping = (subtotal) => ({
  shippingFee: BASE_SHIPPING_FEE,
  shippingDiscount: subtotal >= FREE_SHIPPING_THRESHOLD ? BASE_SHIPPING_FEE : 0,
});

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

const checkoutSelectedCartItems = async ({ userId, productIds }) => {
  try {
    const { data } = await axios.post(
      `${cartServiceUrl}/internal/cart/checkout-items`,
      { userId, productIds },
      {
        timeout: cartServiceTimeoutMs,
        headers: {
          "x-internal-key": cartInternalKey,
        },
      },
    );

    return data.items;
  } catch (error) {
    console.error("[order-service] checkoutSelectedCartItems failed:", {
      url: `${cartServiceUrl}/internal/cart/checkout-items`,
      userId,
      productIds,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to checkout selected cart items",
        error.response.status,
      );
    }

    throw createError("cart-service is unavailable", 502);
  }
};

const restoreCheckoutCartItems = async ({ userId, items }) => {
  try {
    await axios.post(
      `${cartServiceUrl}/internal/cart/restore-items`,
      { userId, items },
      {
        timeout: cartServiceTimeoutMs,
        headers: {
          "x-internal-key": cartInternalKey,
        },
      },
    );
  } catch (error) {
    console.warn("[order-service] restoreCheckoutCartItems failed:", {
      url: `${cartServiceUrl}/internal/cart/restore-items`,
      userId,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });
  }
};

const restoreOrderItemsToCart = async (order) => {
  if (order.cartRestoredAt) {
    return;
  }

  const restoreItems = order.items.map((item) => ({
    productId: item.productId.toString(),
    quantity: item.quantity,
    price: item.price,
    name: item.name,
    imageUrl: item.imageUrl || "",
  }));

  try {
    await axios.post(
      `${cartServiceUrl}/internal/cart/restore-items`,
      {
        userId: order.userId.toString(),
        items: restoreItems,
        sourceOrderId: order._id.toString(),
      },
      {
        timeout: cartServiceTimeoutMs,
        headers: {
          "x-internal-key": cartInternalKey,
        },
      },
    );
  } catch (error) {
    console.error("[order-service] restoreOrderItemsToCart failed:", {
      url: `${cartServiceUrl}/internal/cart/restore-items`,
      orderId: order._id.toString(),
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to restore order items to cart",
        error.response.status,
      );
    }

    throw createError("cart-service is unavailable", 502);
  }
};

const initBankingPayment = async ({ orderId, userId, amount }) => {
  try {
    const { data } = await axios.post(
      `${paymentServiceUrl}/api/payments/banking/init`,
      { orderId, userId, amount },
      {
        timeout: paymentServiceTimeoutMs,
        headers: {
          "x-internal-key": paymentInternalKey,
        },
      },
    );

    return data.payment;
  } catch (error) {
    console.error("[order-service] initBankingPayment failed:", {
      url: `${paymentServiceUrl}/api/payments/banking/init`,
      orderId,
      userId,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to initialize banking payment",
        error.response.status,
      );
    }

    throw createError("payment-service is unavailable", 502);
  }
};

const failBankingPayment = async ({ orderId, rejectedReason }) => {
  try {
    await axios.patch(
      `${paymentServiceUrl}/api/payments/banking/order/${orderId}/fail`,
      { rejectedReason },
      {
        timeout: paymentServiceTimeoutMs,
        headers: {
          "x-internal-key": paymentInternalKey,
        },
      },
    );
  } catch (error) {
    console.warn("[order-service] failBankingPayment failed:", {
      url: `${paymentServiceUrl}/api/payments/banking/order/${orderId}/fail`,
      orderId,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to fail banking payment",
        error.response.status,
      );
    }

    throw createError("payment-service is unavailable", 502);
  }
};

const expireBankingPayment = async ({ orderId }) => {
  try {
    await axios.patch(
      `${paymentServiceUrl}/api/payments/banking/order/${orderId}/expire`,
      {},
      {
        timeout: paymentServiceTimeoutMs,
        headers: {
          "x-internal-key": paymentInternalKey,
        },
      },
    );
  } catch (error) {
    console.warn("[order-service] expireBankingPayment failed:", {
      url: `${paymentServiceUrl}/api/payments/banking/order/${orderId}/expire`,
      orderId,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to expire banking payment",
        error.response.status,
      );
    }

    throw createError("payment-service is unavailable", 502);
  }
};

const validateCouponForOrder = async ({ userId, couponCode, orderAmount, shippingFee }) => {
  if (!couponCode) {
    return {
      couponCode: "",
      couponDiscount: 0,
      couponShippingDiscount: 0,
    };
  }

  try {
    const { data } = await axios.post(
      `${couponServiceUrl}/api/coupons/internal/validate`,
      { code: couponCode, orderAmount, shippingFee },
      {
        timeout: couponServiceTimeoutMs,
        headers: {
          "x-internal-key": couponInternalKey,
          "x-user-id": userId,
        },
      },
    );

    if (!data.valid) {
      throw createError(data.message || "Coupon is not valid", 400);
    }

    return {
      couponCode: data.coupon?.code || couponCode,
      couponDiscount: Number(data.discountAmount || 0),
      couponShippingDiscount: Number(data.shippingDiscount || 0),
    };
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.response) {
      throw createError(error.response.data?.message || "Failed to validate coupon", error.response.status);
    }
    throw createError("coupon-service is unavailable", 502);
  }
};

const markCouponUsed = async ({
  userId,
  couponCode,
  orderId,
  orderAmount,
  shippingFee,
  discountAmount = 0,
}) => {
  if (!couponCode) return;

  try {
    await axios.post(
      `${couponServiceUrl}/api/coupons/internal/mark-used`,
      {
        userId,
        code: couponCode,
        orderId,
        orderAmount,
        shippingFee,
        discountAmount,
      },
      {
        timeout: couponServiceTimeoutMs,
        headers: {
          "x-internal-key": couponInternalKey,
        },
      },
    );
  } catch (error) {
    if (error.response) {
      throw createError(error.response.data?.message || "Failed to mark coupon as used", error.response.status);
    }
    throw createError("coupon-service is unavailable", 502);
  }
};

const grantRewardSpinsIfEligible = async (order) => {
  if (order.orderStatus !== "completed" || order.paymentStatus !== "paid") {
    return null;
  }

  try {
    const { data } = await axios.post(
      `${rewardServiceUrl}/internal/rewards/grant-spins`,
      {
        userId: order.userId.toString(),
        orderId: order._id.toString(),
        paidAmount: order.totalAmount,
      },
      {
        timeout: rewardServiceTimeoutMs,
        headers: {
          "x-internal-key": rewardInternalKey,
        },
      },
    );

    return data;
  } catch (error) {
    console.warn("[order-service] reward spin grant failed:", {
      orderId: order._id.toString(),
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });
    return null;
  }
};

const createOrder = async (userId, payload) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(payload.addressId, "Invalid address id");

  const shippingAddress = await fetchAddressSnapshot({
    userId,
    addressId: payload.addressId,
  });

  const checkoutItems = await checkoutSelectedCartItems({
    userId,
    productIds: payload.selectedCartItemIds,
  });

  const items = checkoutItems.map(normalizeCheckoutItem);
  const subtotal = calculateTotalAmount(items);
  const { shippingFee, shippingDiscount: autoShippingDiscount } = calculateShipping(subtotal);
  const couponResult = await validateCouponForOrder({
    userId,
    couponCode: payload.couponCode,
    orderAmount: subtotal,
    shippingFee: Math.max(0, shippingFee - autoShippingDiscount),
  });
  const shippingDiscount = Math.min(
    shippingFee,
    autoShippingDiscount + couponResult.couponShippingDiscount,
  );
  const couponDiscount = couponResult.couponDiscount;
  const couponShippingDiscount = Math.min(
    Math.max(0, shippingFee - autoShippingDiscount),
    couponResult.couponShippingDiscount,
  );
  const totalAmount = Math.max(0, subtotal + shippingFee - shippingDiscount - couponDiscount);
  const paymentStatus = payload.paymentMethod === "cash" ? "unpaid" : "pending";
  let order;

  try {
    order = await orderRepository.create({
      userId,
      items,
      subtotal,
      shippingFee,
      shippingDiscount,
      couponCode: couponResult.couponCode,
      couponDiscount,
      couponShippingDiscount,
      totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentStatus,
      orderStatus: "pending",
      shippingAddress,
      expiresAt: payload.paymentMethod === "banking" ? bankingExpiryDate() : null,
      notes: payload.notes || "",
    });

    const orderPayload = order.toObject();

    if (payload.paymentMethod === "banking") {
      const payment = await initBankingPayment({
        orderId: order._id.toString(),
        userId,
        amount: totalAmount,
      });

      return {
        order: orderPayload,
        payment,
        nextAction: "UPLOAD_BANKING_PROOF",
      };
    }

    await markCouponUsed({
      userId,
      couponCode: couponResult.couponCode,
      orderId: order._id.toString(),
      orderAmount: subtotal,
      shippingFee: Math.max(0, shippingFee - autoShippingDiscount),
      discountAmount: couponDiscount + couponShippingDiscount,
    });

    return {
      order: orderPayload,
      nextAction: "ORDER_CREATED",
    };
  } catch (error) {
    if (order) {
      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();
      order.notes = order.notes
        ? `${order.notes}\nSystem cancellation: checkout/payment initialization failed`
        : "System cancellation: checkout/payment initialization failed";
      await order.save().catch((saveError) => {
        console.warn("[order-service] failed to cancel incomplete order:", saveError.message);
      });
    }

    await restoreCheckoutCartItems({ userId, items: checkoutItems });
    throw error;
  }
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
    throw createError("Banking payment must be approved before confirming order", 400);
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
  await grantRewardSpinsIfEligible(order);
  return order.toObject();
};

const cancelOrder = async (orderId, reason = "") => {
  const order = await getOrderForUpdate(orderId);
  if (["completed", "cancelled"].includes(order.orderStatus)) {
    throw createError("Order cannot be cancelled in current status", 400);
  }

  if (order.estimatedDeliveryAt) {
    throw createError("Order cannot be cancelled after delivery time has been set", 400);
  }

  if (order.paymentMethod === "banking" && order.paymentStatus !== "paid") {
    await restoreOrderItemsToCart(order);
    order.cartRestoredAt = order.cartRestoredAt || new Date();
    order.paymentStatus = "failed";
    await failBankingPayment({
      orderId,
      rejectedReason: reason || "Order cancelled by admin",
    });
  }

  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledReason = reason || "Order cancelled by admin";
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
  order.paidAt = new Date();
  await order.save();

  if (order.couponCode) {
    const autoShippingDiscount =
      order.subtotal >= FREE_SHIPPING_THRESHOLD ? BASE_SHIPPING_FEE : 0;
    await markCouponUsed({
      userId: order.userId.toString(),
      couponCode: order.couponCode,
      orderId: order._id.toString(),
      orderAmount: order.subtotal,
      shippingFee: Math.max(0, order.shippingFee - autoShippingDiscount),
      discountAmount: order.couponDiscount + (order.couponShippingDiscount || 0),
    });
  }

  await grantRewardSpinsIfEligible(order);
  return order.toObject();
};

const cancelMyBankingOrder = async ({ orderId, userId, reason = "" }) => {
  ensureObjectId(orderId, "Invalid order id");
  ensureObjectId(userId, "Invalid user id");

  const order = await getOrderForUpdate(orderId);
  if (order.userId.toString() !== userId.toString()) {
    throw createError("You do not have permission to cancel this order", 403);
  }

  if (order.paymentMethod !== "banking") {
    throw createError("Only banking orders can be cancelled here", 400);
  }

  if (order.orderStatus !== "pending") {
    throw createError("Only pending banking orders can be cancelled by user", 400);
  }

  if (!["pending", "waiting_verify", "failed"].includes(order.paymentStatus)) {
    throw createError("Only unpaid banking orders can be cancelled", 400);
  }

  await restoreOrderItemsToCart(order);
  order.cartRestoredAt = order.cartRestoredAt || new Date();
  order.orderStatus = "cancelled";
  order.paymentStatus = "failed";
  order.cancelledAt = new Date();
  order.cancelledReason = reason || "Order cancelled by user";
  if (reason) {
    order.notes = order.notes ? `${order.notes}\nCancel reason: ${reason}` : `Cancel reason: ${reason}`;
  }

  await failBankingPayment({
    orderId,
    rejectedReason: reason || "Order cancelled by user",
  });
  await order.save();

  return order.toObject();
};

const expireBankingOrder = async (orderId) => {
  const order = await getOrderForUpdate(orderId);

  if (order.paymentMethod !== "banking") {
    throw createError("Only banking orders can expire through this flow", 400);
  }

  if (order.paymentStatus === "paid") {
    throw createError("Paid banking order cannot be expired", 400);
  }

  if (["confirmed", "shipping", "delivered", "completed"].includes(order.orderStatus)) {
    throw createError("Active delivery order cannot be expired", 400);
  }

  if (order.orderStatus === "cancelled" && order.cartRestoredAt) {
    return order.toObject();
  }

  await restoreOrderItemsToCart(order);
  order.cartRestoredAt = order.cartRestoredAt || new Date();
  order.orderStatus = "cancelled";
  order.paymentStatus = "expired";
  order.cancelledReason = "Payment timeout";
  order.cancelledAt = order.cancelledAt || new Date();

  await expireBankingPayment({ orderId });
  await order.save();

  return order.toObject();
};

const expireOverdueBankingOrders = async () => {
  const orders = await orderRepository.findExpiredBankingCandidates(new Date());
  const results = [];

  for (const order of orders) {
    try {
      const expiredOrder = await expireBankingOrder(order._id.toString());
      results.push({ orderId: order._id.toString(), success: true, order: expiredOrder });
    } catch (error) {
      console.error("[order-service] expire overdue banking order failed:", {
        orderId: order._id.toString(),
        message: error.message,
        statusCode: error.statusCode,
      });
      results.push({
        orderId: order._id.toString(),
        success: false,
        message: error.message,
      });
    }
  }

  return results;
};

const updatePaymentStatusInternal = async (orderId, paymentStatus) => {
  const order = await getOrderForUpdate(orderId);

  if (order.paymentMethod !== "banking") {
    throw createError("Internal payment status update is for banking orders", 400);
  }

  order.paymentStatus = paymentStatus;
  if (paymentStatus === "paid") {
    order.paidAt = order.paidAt || new Date();
  }
  await order.save();

  if (paymentStatus === "paid" && order.couponCode) {
    const autoShippingDiscount =
      order.subtotal >= FREE_SHIPPING_THRESHOLD ? BASE_SHIPPING_FEE : 0;
    await markCouponUsed({
      userId: order.userId.toString(),
      couponCode: order.couponCode,
      orderId: order._id.toString(),
      orderAmount: order.subtotal,
      shippingFee: Math.max(0, order.shippingFee - autoShippingDiscount),
      discountAmount: order.couponDiscount + (order.couponShippingDiscount || 0),
    });
  }

  await grantRewardSpinsIfEligible(order);
  return order.toObject();
};

const checkReviewEligibility = async ({ userId, productId, orderId }) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(productId, "Invalid product id");
  ensureObjectId(orderId, "Invalid order id");

  const order = await orderRepository.findById(orderId);

  if (!order) {
    return { eligible: false, reason: "Order not found" };
  }

  if (order.userId.toString() !== userId) {
    return { eligible: false, reason: "Order does not belong to this user" };
  }

  if (order.orderStatus !== "completed") {
    return {
      eligible: false,
      reason: "Only completed orders can be reviewed",
    };
  }

  if (order.paymentStatus !== "paid") {
    return {
      eligible: false,
      reason: "Only paid orders can be reviewed",
    };
  }

  const orderItem = (order.items || []).find(
    (item) => item.productId?.toString() === productId,
  );

  if (!orderItem) {
    return {
      eligible: false,
      reason: "Product was not purchased in this order",
    };
  }

  return {
    eligible: true,
    orderItem: {
      productId: orderItem.productId,
      name: orderItem.name,
      quantity: orderItem.quantity,
      price: orderItem.price,
    },
  };
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
  cancelMyBankingOrder,
  expireBankingOrder,
  expireOverdueBankingOrders,
  updateCodPaymentStatus,
  updatePaymentStatusInternal,
  checkReviewEligibility,
};
