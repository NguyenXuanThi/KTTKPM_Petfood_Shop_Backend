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
const TOPICS = require("../events/topics");
const { publishEvent } = require("../events/kafkaProducer");

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

const initBankingPayment = async ({ orderId, userId, amount }) => {
  ensureObjectId(orderId, "Invalid order id");
  ensureObjectId(userId, "Invalid user id");

  const payment = await Payment.findOneAndUpdate(
    { orderId },
    {
      $setOnInsert: {
        orderId,
        userId,
        paymentMethod: "banking",
        amount,
        status: "pending",
        proofImageUrl: null,
        proofImagePublicId: null,
        verifiedBy: null,
        verifiedAt: null,
        rejectedReason: "",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return payment.toObject();
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

  try {
    const { data } = await axios.post(`${uploadServiceUrl}/api/upload/payment`, formData, {
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

  const payment = await Payment.findOne({ orderId });

  if (!payment) {
    throw createError("Banking payment record not found", 404);
  }

  if (payment.paymentMethod !== "banking") {
    throw createError("Cannot upload proof for non-banking payment", 400);
  }

  if (payment.userId.toString() !== userId.toString()) {
    throw createError("Only owner can upload payment proof", 403);
  }

  const order = await fetchOrderAsUser({ orderId, accessToken });

  if (order.userId.toString() !== userId.toString()) {
    throw createError("Only owner can upload payment proof", 403);
  }

  if (order.paymentMethod !== "banking") {
    throw createError("Cannot upload proof for non-banking payment", 400);
  }

  if (order.orderStatus === "cancelled") {
    throw createError("Cannot upload proof for cancelled order", 400);
  }

  if (payment.status === "expired" || order.paymentStatus === "expired") {
    throw createError("Payment has expired", 400);
  }

  if (!["pending", "failed"].includes(order.paymentStatus)) {
    throw createError("Order payment status does not allow proof upload", 400);
  }

  const uploaded = await uploadProofImage({ file });

  payment.amount = order.totalAmount;
  payment.status = "waiting_verify";
  payment.proofImageUrl = uploaded.url;
  payment.proofImagePublicId = uploaded.publicId || uploaded.key;
  payment.rejectedReason = "";
  payment.verifiedBy = null;
  payment.verifiedAt = null;
  await payment.save();

  await syncOrderPaymentStatus({ orderId, paymentStatus: "waiting_verify" });

  return payment.toObject();
};

const listPendingBankingPayments = async ({ page, limit }) => {
  const skip = (page - 1) * limit;
  const filter = {
    paymentMethod: "banking",
    status: { $in: ["pending", "waiting_verify"] },
  };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
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
  const paidPublish = await publishEvent(TOPICS.PAYMENT_PAID, {
    data: {
      paymentId: payment._id.toString(),
      orderId: payment.orderId.toString(),
      userId: payment.userId.toString(),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.verifiedAt || new Date(),
    },
  });
  if (paidPublish.published) {
    console.log(
      `[payment-service] Published payment.paid eventId=${paidPublish.event.eventId} orderId=${payment.orderId} userId=${payment.userId} amount=${payment.amount}`,
    );
  } else {
    console.warn("[payment-service] Kafka unavailable, skipped payment.paid publish");
  }

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
  const failedPublish = await publishEvent(TOPICS.PAYMENT_FAILED, {
    data: {
      paymentId: payment._id.toString(),
      orderId: payment.orderId.toString(),
      userId: payment.userId.toString(),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      failedAt: payment.verifiedAt || new Date(),
      rejectedReason,
    },
  });
  if (failedPublish.published) {
    console.log(
      `[payment-service] Published payment.failed eventId=${failedPublish.event.eventId} orderId=${payment.orderId} reason=${rejectedReason}`,
    );
  } else {
    console.warn("[payment-service] Kafka unavailable, skipped payment.failed publish");
  }

  return payment.toObject();
};

const failBankingPaymentByOrder = async ({ orderId, rejectedReason = "Order cancelled by user" }) => {
  ensureObjectId(orderId, "Invalid order id");

  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw createError("Banking payment record not found", 404);
  }

  if (payment.paymentMethod !== "banking") {
    throw createError("Cannot fail non-banking payment here", 400);
  }

  if (payment.status === "paid") {
    throw createError("Paid payment cannot be failed", 400);
  }

  payment.status = "failed";
  payment.rejectedReason = rejectedReason;
  await payment.save();

  return payment.toObject();
};

const expireBankingPaymentByOrder = async ({ orderId }) => {
  ensureObjectId(orderId, "Invalid order id");

  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw createError("Banking payment record not found", 404);
  }

  if (payment.paymentMethod !== "banking") {
    throw createError("Cannot expire non-banking payment here", 400);
  }

  if (payment.status === "paid") {
    throw createError("Paid payment cannot be expired", 400);
  }

  payment.status = "expired";
  payment.rejectedReason = "Payment timeout";
  await payment.save();

  return payment.toObject();
};

module.exports = {
  initBankingPayment,
  uploadBankingProof,
  listPendingBankingPayments,
  approvePayment,
  rejectPayment,
  failBankingPaymentByOrder,
  expireBankingPaymentByOrder,
};
