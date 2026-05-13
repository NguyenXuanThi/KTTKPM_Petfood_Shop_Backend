const couponService = require("../services/couponService");
const {
  createCouponSchema,
  assignCouponSchema,
  idParamSchema,
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
    const coupons = await couponService.getMyCoupons(req.auth.sub);

    return res.status(200).json({ coupons });
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
  getMyCoupons,
  listCoupons,
  assignBirthdayCoupon,
};
