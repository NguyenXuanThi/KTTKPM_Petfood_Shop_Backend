const orderService = require("../services/orderService");
const {
  createOrderSchema,
  listAdminOrdersQuerySchema,
  idParamSchema,
  shippingUpdateSchema,
  cancelOrderSchema,
  codPaymentStatusSchema,
  internalPaymentStatusSchema,
} = require("../validators/orderValidator");

const createOrder = async (req, res, next) => {
  try {
    console.log("[order-service] POST /orders - userId:", req.auth?.sub);
    const payload = await createOrderSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const result = await orderService.createOrder(req.auth.sub, payload);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getMyOrders(req.auth.sub);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return next(error);
  }
};

const getMyShippingOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getMyShippingOrders(req.auth.sub);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.getOrderById(id, req.auth);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const listAdminOrders = async (req, res, next) => {
  try {
    const query = await listAdminOrdersQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await orderService.listAdminOrders(query);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

const listPendingOrders = async (req, res, next) => {
  try {
    const query = await listAdminOrdersQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await orderService.listAdminOrders({
      ...query,
      orderStatus: "pending",
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

const confirmOrder = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const order = await orderService.confirmOrder(id);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const markShipping = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await shippingUpdateSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.markShipping(id, payload.estimatedDeliveryAt);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const markDelivered = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const order = await orderService.markDelivered(id);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const markCompleted = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const order = await orderService.markCompleted(id);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await cancelOrderSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.cancelOrder(id, payload.reason || "");
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const cancelMyBankingOrder = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await cancelOrderSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.cancelMyBankingOrder({
      orderId: id,
      userId: req.auth.sub,
      reason: payload.reason || "",
    });
    return res.status(200).json({
      success: true,
      message: "Order cancelled and items restored to cart",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const updateCodPaymentStatus = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await codPaymentStatusSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.updateCodPaymentStatus(id, payload.paymentStatus);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const updatePaymentStatusInternal = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await internalPaymentStatusSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const order = await orderService.updatePaymentStatusInternal(
      id,
      payload.paymentStatus,
    );
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyShippingOrders,
  getOrderById,
  listAdminOrders,
  listPendingOrders,
  confirmOrder,
  markShipping,
  markDelivered,
  markCompleted,
  cancelOrder,
  cancelMyBankingOrder,
  updateCodPaymentStatus,
  updatePaymentStatusInternal,
};
