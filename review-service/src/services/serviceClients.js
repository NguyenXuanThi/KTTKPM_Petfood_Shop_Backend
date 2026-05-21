const axios = require("axios");
const {
  orderServiceUrl,
  orderInternalKey,
  productServiceUrl,
  productInternalKey,
  userServiceUrl,
  serviceTimeoutMs,
} = require("../config/env");

const orderClient = axios.create({
  baseURL: orderServiceUrl,
  timeout: serviceTimeoutMs,
  headers: { "x-internal-key": orderInternalKey },
});

const productClient = axios.create({
  baseURL: productServiceUrl,
  timeout: serviceTimeoutMs,
  headers: { "x-internal-key": productInternalKey },
});

const userClient = axios.create({
  baseURL: userServiceUrl,
  timeout: serviceTimeoutMs,
});

const checkReviewEligibility = async ({ userId, productId, orderId }) => {
  try {
    const response = await orderClient.get("/internal/orders/check-review-eligibility", {
      params: { userId, productId, orderId },
    });
    return response.data;
  } catch (error) {
    if (error.response?.data) return error.response.data;
    const err = new Error("Unable to verify review eligibility with order-service");
    err.statusCode = 502;
    throw err;
  }
};

const updateProductRatingSummary = async (productId, summary) => {
  try {
    await productClient.patch(`/internal/products/${productId}/rating-summary`, summary);
  } catch (error) {
    console.warn("[review-service] product rating summary sync failed", {
      productId,
      message: error.response?.data?.message || error.message,
    });
  }
};

const getUserSnapshot = async (userId) => {
  try {
    const response = await userClient.get(`/users/internal/${userId}`);
    const user = response.data.user || response.data;
    return {
      fullName: user.fullName || "Customer",
      avatarUrl: user.avatarUrl || "",
    };
  } catch (error) {
    console.warn("[review-service] user snapshot fallback", {
      userId,
      message: error.response?.data?.message || error.message,
    });
    return { fullName: "Customer", avatarUrl: "" };
  }
};

module.exports = {
  checkReviewEligibility,
  updateProductRatingSummary,
  getUserSnapshot,
};
