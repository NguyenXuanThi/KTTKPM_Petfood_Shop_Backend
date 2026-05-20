const paymentService = require("../services/paymentService");
const {
  uploadProofSchema,
  initBankingPaymentSchema,
  idParamSchema,
  orderIdParamSchema,
  rejectPaymentSchema,
  pagingQuerySchema,
} = require("../validators/paymentValidator");

const initBankingPayment = async (req, res, next) => {
  try {
    const payload = await initBankingPaymentSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const payment = await paymentService.initBankingPayment(payload);

    return res.status(201).json({
      success: true,
      message: "Banking payment initialized",
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const uploadBankingProof = async (req, res, next) => {
  try {
    const payload = await uploadProofSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const payment = await paymentService.uploadBankingProof({
      userId: req.auth.sub,
      accessToken: req.headers.authorization?.split(" ")[1],
      orderId: payload.orderId,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: "Payment proof uploaded. Waiting for admin verification.",
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const listPendingBankingPayments = async (req, res, next) => {
  try {
    const query = await pagingQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await paymentService.listPendingBankingPayments(query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

const approvePayment = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const payment = await paymentService.approvePayment({
      paymentId: id,
      adminId: req.auth.sub,
    });

    return res.status(200).json({
      success: true,
      message: "Payment approved successfully",
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const rejectPayment = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const body = await rejectPaymentSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const payment = await paymentService.rejectPayment({
      paymentId: id,
      adminId: req.auth.sub,
      rejectedReason: body.rejectedReason,
    });

    return res.status(200).json({
      success: true,
      message: "Payment rejected successfully",
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const failBankingPaymentByOrder = async (req, res, next) => {
  try {
    const { orderId } = await orderIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const payment = await paymentService.failBankingPaymentByOrder({
      orderId,
      rejectedReason: req.body?.rejectedReason || "Order cancelled by user",
    });

    return res.status(200).json({
      success: true,
      message: "Banking payment failed",
      payment,
    });
  } catch (error) {
    return next(error);
  }
};

const expireBankingPaymentByOrder = async (req, res, next) => {
  try {
    const { orderId } = await orderIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const payment = await paymentService.expireBankingPaymentByOrder({ orderId });

    return res.status(200).json({
      success: true,
      message: "Banking payment expired",
      payment,
    });
  } catch (error) {
    return next(error);
  }
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
