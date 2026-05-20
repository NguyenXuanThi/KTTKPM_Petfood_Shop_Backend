const { createPaymentUrl, verifyReturnUrl } = require("../utils/vnpay");
const Payment = require("../models/Payment");
const orderClient = require("../services/orderClient");

/**
 * POST /payments/vnpay/create
 * Tạo payment URL cho VNPay
 */
const createVnpayPayment = async (req, res, next) => {
  try {
    const { orderId, amount, orderInfo } = req.body;
    const userId = req.auth.sub;

    // Tạo payment record
    const payment = await Payment.create({
      orderId,
      userId,
      method: "vnpay",
      amount,
      status: "pending",
    });

    // Tạo VNPay payment URL
    const paymentUrl = createPaymentUrl({
      txnRef: payment._id.toString(),
      amount,
      orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      ipAddr: req.ip || req.connection.remoteAddress || "127.0.0.1",
    });

    return res.json({
      success: true,
      paymentUrl,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Create VNPay payment error:", error);
    return next(error);
  }
};

/**
 * GET /payments/vnpay/verify
 * Verify VNPay return URL
 */
const verifyVnpayReturn = async (req, res, next) => {
  try {
    const params = req.query;

    // Verify signature
    if (!verifyReturnUrl(params)) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo } = params;

    // Find payment
    const payment = await Payment.findById(vnp_TxnRef);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment status
    if (vnp_ResponseCode === "00") {
      payment.status = "paid";
      payment.transactionId = vnp_TransactionNo;
      payment.paidAt = new Date();
      await payment.save();

      // Notify order service
      await orderClient.notifyPaymentSucceeded(payment.orderId, payment._id);

      return res.json({
        success: true,
        status: "PAID",
        orderId: payment.orderId,
        paymentId: payment._id,
      });
    } else {
      payment.status = "failed";
      await payment.save();

      return res.json({
        success: true,
        status: "FAILED",
        orderId: payment.orderId,
        paymentId: payment._id,
      });
    }
  } catch (error) {
    console.error("Verify VNPay return error:", error);
    return next(error);
  }
};

module.exports = {
  createVnpayPayment,
  verifyVnpayReturn,
};
