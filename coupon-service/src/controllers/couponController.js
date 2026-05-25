const couponService = require("../services/couponService");
const {
  createCouponSchema,
  assignCouponSchema,
  internalAssignCouponSchema,
  idParamSchema,
  validateCouponSchema,
  usableCouponsQuerySchema,
  markCouponUsedSchema,
  batchCouponsSchema,
} = require("../validators/couponValidator");

// POST /coupons — Admin creates a coupon
const createCoupon = async (req, res, next) => {
  try {
    const payload = await createCouponSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const coupon = await couponService.createCoupon(req.auth.sub, payload);

    return res.status(201).json({ message: "Coupon created", coupon });
  } catch (error) {
    return next(error);
  }
};

// PATCH /coupons/:id/disable — Admin disables a coupon
const disableCoupon = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const coupon = await couponService.disableCoupon(id);

    return res.status(200).json({ message: "Coupon disabled", coupon });
  } catch (error) {
    return next(error);
  }
};

// POST /coupons/assign — Admin assigns a coupon to a user
const assignCoupon = async (req, res, next) => {
  try {
    const payload = await assignCouponSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const userCoupon = await couponService.assignCoupon(payload);

    return res.status(200).json({ message: "Coupon assigned", userCoupon });
  } catch (error) {
    return next(error);
  }
};

// GET /coupons/my — Authenticated user views their coupons
const getMyCoupons = async (req, res, next) => {
  try {
    const query = await usableCouponsQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const coupons = await couponService.getMyCoupons(req.auth.sub, {
      ...query,
      onlyUsable: req.query.orderAmount !== undefined,
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return next(error);
  }
};

const assignCouponInternal = async (req, res, next) => {
  try {
    const payload = await internalAssignCouponSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const userCoupon = await couponService.assignCouponInternal(payload);

    return res.status(200).json({
      success: true,
      message: "Coupon assigned",
      userCoupon,
    });
  } catch (error) {
    return next(error);
  }
};

const getCouponsBatchInternal = async (req, res, next) => {
  try {
    const payload = await batchCouponsSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const coupons = await couponService.getCouponsByIds(payload.couponIds);

    return res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error) {
    return next(error);
  }
};

const getPublicCoupons = async (req, res, next) => {
  try {
    const query = await usableCouponsQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const coupons = await couponService.getPublicCoupons({
      userId: req.auth.sub,
      ...query,
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return next(error);
  }
};

const getAvailableCoupons = async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const query = await usableCouponsQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const coupons = await couponService.getAvailableCoupons({
      userId: req.auth.sub,
      subtotal: query.subtotal ?? query.orderAmount ?? 0,
      shippingFee: query.shippingFee,
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return next(error);
  }
};

const validateCoupon = async (req, res, next) => {
  try {
    const payload = await validateCouponSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await couponService.validateCoupon({
      userId: req.auth?.sub || req.headers["x-user-id"] || req.body.userId,
      code: payload.code,
      orderAmount: payload.orderAmount ?? payload.subtotal,
      shippingFee: payload.shippingFee,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const markCouponUsed = async (req, res, next) => {
  try {
    const payload = await markCouponUsedSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await couponService.markCouponUsed(payload);

    return res.status(200).json({ message: "Coupon usage recorded", ...result });
  } catch (error) {
    return next(error);
  }
};

// GET /coupons — Admin lists all coupons
const listCoupons = async (req, res, next) => {
  try {
    const coupons = await couponService.listCoupons();

    return res.status(200).json({ coupons });
  } catch (error) {
    return next(error);
  }
};

// POST /coupons/assign/birthday — Admin assigns birthday coupon to a user
const assignBirthdayCoupon = async (req, res, next) => {
  try {
    const payload = await idParamSchema.validateAsync(
      { id: req.body.userId },
      { abortEarly: false, stripUnknown: true, convert: true }
    );

    const result = await couponService.assignBirthdayCoupon({
      userId: payload.id,
      adminId: req.auth.sub,
    });

    return res.status(200).json({ message: "Birthday coupon assigned", ...result });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCoupon,
  disableCoupon,
  assignCoupon,
  assignCouponInternal,
  getCouponsBatchInternal,
  getMyCoupons,
  getPublicCoupons,
  getAvailableCoupons,
  validateCoupon,
  markCouponUsed,
  listCoupons,
  assignBirthdayCoupon,
};
