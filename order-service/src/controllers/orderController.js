const orderService = require("../services/orderService");
const {
  createOrderSchema,
  listOrderSchema,
  updateOrderStatusSchema,
  updateDeliveryTimeSchema,
  paymentSucceededEventSchema,
} = require("../validators/orderValidator");

const createOrder = async (req, res, next) => {
  try {
    const payload = await createOrderSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const order = await orderService.createOrder(req.auth.sub, payload);

    return res.status(201).json({
      message: "Create order successful",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getMyOrders(req.auth.sub);

    return res.status(200).json({ orders });
  } catch (error) {
    return next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrder(req.params.id, req.auth);

    return res.status(200).json({ order });
  } catch (error) {
    return next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const query = await listOrderSchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await orderService.listOrders(query);

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const payload = await updateOrderStatusSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const order = await orderService.updateOrderStatus(req.params.id, payload, req.auth);

    return res.status(200).json({
      message: "Update order successful",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const listWaitingForProcessing = async (req, res, next) => {
  try {
    const query = await listOrderSchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await orderService.listWaitingForProcessing(query);

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateDeliveryTime = async (req, res, next) => {
  try {
    const payload = await updateDeliveryTimeSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const order = await orderService.updateDeliveryTime(
      req.params.id,
      req.auth.sub,
      payload.deliveryEstimatedTime
    );

    return res.status(200).json({
      message: "Update delivery time successful",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const handlePaymentSucceeded = async (req, res, next) => {
  try {
    const payload = await paymentSucceededEventSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const order = await orderService.handlePaymentSucceeded(payload);

    return res.status(200).json({
      message: "PaymentSucceeded handled",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

const markDeliveryPopupSeen = async (req, res, next) => {
  try {
    const order = await orderService.markDeliveryPopupSeen(req.params.id, req.auth.sub);

    return res.status(200).json({
      message: "Delivery popup marked as seen",
      order,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  listOrders,
  listWaitingForProcessing,
  updateDeliveryTime,
  updateOrderStatus,
  handlePaymentSucceeded,
  markDeliveryPopupSeen,
};
