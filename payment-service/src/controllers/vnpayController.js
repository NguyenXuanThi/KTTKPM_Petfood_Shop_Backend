const { createPaymentUrl, verifyReturnUrl } = require("../utils/vnpay");
const { Payment } = require("../models/Payment");
const orderClient = require("../services/orderClient");

const initVnpayPayment = async (req, res, next) => {
  try {
    const { orderId, userId, amount, ipAddr } = req.body;

    const payment = await Payment.create({
      orderId,
      userId,
      paymentMethod: "vnpay",
      amount,
      status: "pending",
    });

    const paymentUrl = createPaymentUrl({
      txnRef: payment._id.toString(),
      amount,
      orderInfo: `Thanh toan don hang ${orderId}`,
      ipAddr: ipAddr || "127.0.0.1",
    });

    return res.json({
      success: true,
      payment,
      paymentUrl,
    });
  } catch (error) {
    console.error("Init VNPay payment (internal) error:", error);
    return next(error);
  }
};

const createVnpayPayment = async (req, res, next) => {
  try {
    const { orderId, amount, orderInfo } = req.body;
    const userId = req.auth.sub;

    const payment = await Payment.create({
      orderId,
      userId,
      paymentMethod: "vnpay",
      amount,
      status: "pending",
    });

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

const verifyVnpayReturn = async (req, res, next) => {
  try {
    const params = req.query;

    if (!verifyReturnUrl(params)) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo } = params;

    const payment = await Payment.findById(vnp_TxnRef);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (vnp_ResponseCode === "00") {
      payment.status = "paid";
      payment.verifiedAt = new Date();
      await payment.save();

      await orderClient.notifyPaymentSucceeded(payment.orderId.toString());

      return res.json({
        success: true,
        status: "PAID",
        orderId: payment.orderId,
        paymentId: payment._id,
      });
    }

    payment.status = "failed";
    await payment.save();

    return res.json({
      success: true,
      status: "FAILED",
      orderId: payment.orderId,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Verify VNPay return error:", error);
    return next(error);
  }
};

module.exports = {
  initVnpayPayment,
  createVnpayPayment,
  verifyVnpayReturn,
};
