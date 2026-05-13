const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const { Payment } = require("../models/Payment");
const {
  orderServiceUrl,
  orderServiceTimeoutMs,
  uploadServiceUrl,
  uploadServiceTimeoutMs,
  orderInternalKey,
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

const fetchOrderAsUser = async ({ orderId, accessToken }) => {
  try {
    const { data } = await axios.get(`${orderServiceUrl}/api/orders/${orderId}`, {
      timeout: orderServiceTimeoutMs,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return data.order;
  } catch (error) {
    if (error.response) {
      throw createError(
        error.response.data?.message || "Order request failed",
        error.response.status,
      );
    }
    throw createError("order-service is unavailable", 502);
  }
};

const syncOrderPaymentStatus = async ({ orderId, paymentStatus }) => {
  try {
    await axios.patch(
      `${orderServiceUrl}/api/internal/orders/${orderId}/payment-status`,
      { paymentStatus },
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
        error.response.data?.message || "Failed to sync order payment status",
        error.response.status,
      );
    }
    throw createError("order-service is unavailable", 502);
  }
};

const uploadProofImage = async ({ file }) => {
  const formData = new FormData();
  formData.append("file", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
    knownLength: file.size,
  });
  formData.append("type", "payment");

  try {
    const { data } = await axios.post(`${uploadServiceUrl}/api/upload`, formData, {
      timeout: uploadServiceTimeoutMs,
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return data;
  } catch (error) {
    if (error.response) {
      throw createError(
        error.response.data?.message || "Failed to upload payment proof",
        error.response.status,
      );
    }
    throw createError("upload-service is unavailable", 502);
  }
};

const uploadBankingProof = async ({ userId, accessToken, orderId, file }) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(orderId, "Invalid order id");

  if (!file) {
    throw createError("proof image is required", 400);
  }

  const order = await fetchOrderAsUser({ orderId, accessToken });

  if (order.userId.toString() !== userId.toString()) {
    throw createError("You do not have permission to upload proof for this order", 403);
  }

  if (order.paymentMethod !== "banking") {
    throw createError("Proof upload is only for banking orders", 400);
  }

  if (!["pending", "failed"].includes(order.paymentStatus)) {
    throw createError("Order payment status does not allow proof upload", 400);
  }

  const uploaded = await uploadProofImage({ file });

  const payment = await Payment.findOneAndUpdate(
    { orderId },
    {
      orderId,
      userId,
      paymentMethod: "banking",
      amount: order.totalAmount,
      status: "waiting_verify",
      proofImageUrl: uploaded.url,
      proofImagePublicId: uploaded.key,
      rejectedReason: "",
      verifiedBy: null,
      verifiedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await syncOrderPaymentStatus({ orderId, paymentStatus: "waiting_verify" });

  return payment.toObject();
};

const listPendingBankingPayments = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find({ paymentMethod: "banking", status: "waiting_verify" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments({ paymentMethod: "banking", status: "waiting_verify" }),
  ]);

  return {
    payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const approvePayment = async ({ paymentId, adminId }) => {
  ensureObjectId(paymentId, "Invalid payment id");
  ensureObjectId(adminId, "Invalid admin id");

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw createError("Payment not found", 404);
  }

  if (payment.paymentMethod !== "banking") {
    throw createError("Only banking payments can be approved here", 400);
  }

  if (payment.status !== "waiting_verify") {
    throw createError("Payment is not waiting verification", 400);
  }

  payment.status = "paid";
  payment.verifiedBy = adminId;
  payment.verifiedAt = new Date();
  payment.rejectedReason = "";
  await payment.save();

  await syncOrderPaymentStatus({ orderId: payment.orderId, paymentStatus: "paid" });

  return payment.toObject();
};

const rejectPayment = async ({ paymentId, adminId, rejectedReason }) => {
  ensureObjectId(paymentId, "Invalid payment id");
  ensureObjectId(adminId, "Invalid admin id");

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw createError("Payment not found", 404);
  }

  if (payment.paymentMethod !== "banking") {
    throw createError("Only banking payments can be rejected here", 400);
  }

  if (payment.status !== "waiting_verify") {
    throw createError("Payment is not waiting verification", 400);
  }

  payment.status = "failed";
  payment.verifiedBy = adminId;
  payment.verifiedAt = new Date();
  payment.rejectedReason = rejectedReason;
  await payment.save();

  await syncOrderPaymentStatus({ orderId: payment.orderId, paymentStatus: "failed" });

  return payment.toObject();
};

module.exports = {
  uploadBankingProof,
  listPendingBankingPayments,
  approvePayment,
  rejectPayment,
};
