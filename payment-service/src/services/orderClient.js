const axios = require("axios");
const {
  orderServiceUrl,
  orderServiceTimeoutMs,
  orderInternalKey,
} = require("../config/env");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const notifyPaymentSucceeded = async (orderId) => {
  try {
    await axios.patch(
      `${orderServiceUrl}/api/internal/orders/${orderId}/payment-status`,
      { paymentStatus: "paid" },
      {
        timeout: orderServiceTimeoutMs,
        headers: {
          "x-internal-key": orderInternalKey,
        },
      },
    );
  } catch (error) {
    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to notify order payment status",
        error.response.status,
      );
    }
    throw createError("order-service is unavailable", 502);
  }
};

module.exports = {
  notifyPaymentSucceeded,
};
