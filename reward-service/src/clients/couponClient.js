const axios = require("axios");
const { couponServiceUrl, couponInternalKey, serviceTimeoutMs } = require("../config/env");

const couponClient = axios.create({
  baseURL: couponServiceUrl,
  timeout: serviceTimeoutMs,
  headers: { "x-internal-key": couponInternalKey },
});

const assignCoupon = async ({ userId, couponId, source }) => {
  try {
    const { data } = await couponClient.post("/internal/coupons/assign", {
      userId,
      couponId,
      assignedBy: "system",
      source,
    });
    return data;
  } catch (error) {
    if (error.response?.status === 409 || error.response?.status === 400) {
      return {
        success: true,
        duplicate: true,
        message: error.response?.data?.message || "Coupon already assigned",
      };
    }
    const err = new Error(error.response?.data?.message || "Coupon assignment failed");
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};

const getCouponsByIds = async (couponIds = []) => {
  const ids = [...new Set(couponIds.filter(Boolean).map((id) => id.toString()))];
  if (!ids.length) return [];

  try {
    const { data } = await couponClient.post("/internal/coupons/batch", {
      couponIds: ids,
    });
    return data.coupons || [];
  } catch (error) {
    const err = new Error(error.response?.data?.message || "Coupon details lookup failed");
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};

module.exports = { assignCoupon, getCouponsByIds };
