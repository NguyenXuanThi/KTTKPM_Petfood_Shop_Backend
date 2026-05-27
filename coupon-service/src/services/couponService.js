const axios = require("axios");
const Coupon = require("../models/Coupon");
const UserCoupon = require("../models/UserCoupon");
const { getJson, setJson, deleteByPattern } = require("../config/redis");
const {
  userServiceUrl,
  userServiceTimeoutMs,
  notificationServiceUrl,
  notificationServiceTimeoutMs,
} = require("../config/env");

const PUBLIC_COUPON_CACHE_KEY = "cache:coupons:public";
const AVAILABLE_COUPON_CACHE_PREFIX = "cache:coupons:available";
const PUBLIC_COUPON_TTL_SECONDS = 3 * 60;
const AVAILABLE_COUPON_TTL_SECONDS = 60;

// ─── Helpers ────────────────────────────────────────────────────────────────

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const fetchUser = async (userId) => {
  const { data } = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
    timeout: userServiceTimeoutMs,
  });
  return data.user;
};

const availableCouponCacheKey = ({ userId, subtotal, shippingFee }) =>
  `${AVAILABLE_COUPON_CACHE_PREFIX}:${userId}:${Number(subtotal || 0)}:${Number(shippingFee || 0)}`;

const invalidateCouponCache = async () => {
  await deleteByPattern("cache:coupons:*");
};

const invalidCoupon = (message) => ({
  valid: false,
  discountAmount: 0,
  shippingDiscount: 0,
  finalAmount: 0,
  message,
});

const publicCouponDto = (coupon) => ({
  _id: coupon._id,
  code: coupon.code,
  description: coupon.description,
  type: coupon.type,
  discountValue: coupon.discountValue,
  minOrderAmount: coupon.minOrderAmount,
  scope: coupon.scope,
  appliesTo: coupon.appliesTo,
  maxDiscountAmount: coupon.maxDiscountAmount,
  expiresAt: coupon.expiresAt,
  isActive: coupon.isActive,
  usageLimit: coupon.usageLimit,
  usedCount: coupon.usedCount,
  perUserLimit: coupon.perUserLimit,
});

const isCouponExpired = (coupon, now = new Date()) =>
  Boolean(coupon?.expiresAt) && coupon.expiresAt <= now;

const isCouponActiveNow = (coupon, now = new Date()) =>
  Boolean(coupon?.isActive) && !isCouponExpired(coupon, now);

const hasGlobalUsageLeft = (coupon) =>
  coupon.usageLimit === null ||
  coupon.usageLimit === undefined ||
  coupon.usedCount < coupon.usageLimit;

const assignedScopes = ["user", "birthday", "reward"];

const isUserCouponActiveNow = (userCoupon, coupon, now = new Date()) => {
  if (!userCoupon || userCoupon.status !== "active") return false;
  if (userCoupon.expiresAt && userCoupon.expiresAt <= now) return false;
  if (coupon?.expiresAt && coupon.expiresAt <= now) return false;
  return true;
};

const calculateCouponDiscount = ({ coupon, orderAmount, shippingFee }) => {
  const base = coupon.appliesTo === "shipping" ? shippingFee : orderAmount;
  let discount =
    coupon.type === "percentage"
      ? Math.floor((base * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  discount = Math.min(discount, base);

  return {
    discountAmount: coupon.appliesTo === "order" ? discount : 0,
    shippingDiscount: coupon.appliesTo === "shipping" ? discount : 0,
  };
};

const validateCouponForUser = async ({ userId, code, orderAmount, shippingFee }) => {
  if (!userId) {
    throw createError("User id is required to validate coupon", 400);
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  const grossAmount = Number(orderAmount) + Number(shippingFee);

  if (!coupon) {
    return { ...invalidCoupon("Coupon not found"), finalAmount: grossAmount };
  }

  if (!isCouponActiveNow(coupon)) {
    return { ...invalidCoupon("Coupon is inactive or expired"), finalAmount: grossAmount };
  }

  if (!hasGlobalUsageLeft(coupon)) {
    return { ...invalidCoupon("Coupon usage limit reached"), finalAmount: grossAmount };
  }

  if (Number(orderAmount) < Number(coupon.minOrderAmount || 0)) {
    return {
      ...invalidCoupon(`Minimum order amount is ${coupon.minOrderAmount}`),
      finalAmount: grossAmount,
    };
  }

  const usedByUser = await UserCoupon.countDocuments({
    userId,
    couponId: coupon._id,
    status: "used",
  });

  if (usedByUser >= Number(coupon.perUserLimit || 1)) {
    return { ...invalidCoupon("You have reached the usage limit for this coupon"), finalAmount: grossAmount };
  }

  let userCoupon = null;
  if (assignedScopes.includes(coupon.scope)) {
    userCoupon = await UserCoupon.findOne({
      userId,
      couponId: coupon._id,
      status: "active",
    });

    if (!isUserCouponActiveNow(userCoupon, coupon)) {
      return {
        ...invalidCoupon("This coupon is not available for your account"),
        finalAmount: grossAmount,
      };
    }
  }

  const { discountAmount, shippingDiscount } = calculateCouponDiscount({
    coupon,
    orderAmount: Number(orderAmount),
    shippingFee: Number(shippingFee),
  });

  return {
    valid: true,
    coupon: publicCouponDto(coupon),
    userCouponId: userCoupon?._id || null,
    discountAmount,
    shippingDiscount,
    finalAmount: Math.max(0, grossAmount - discountAmount - shippingDiscount),
    message: "Coupon applied successfully",
  };
};

const availableCouponDto = ({ coupon, validation, source, userCouponId = null }) => ({
  couponId: coupon._id,
  userCouponId,
  code: coupon.code,
  description: coupon.description,
  scope: coupon.scope,
  type: coupon.type,
  discountValue: coupon.discountValue,
  minOrderAmount: coupon.minOrderAmount,
  maxDiscountAmount: coupon.maxDiscountAmount,
  appliesTo: coupon.appliesTo,
  expiresAt: coupon.expiresAt,
  discountPreview: Number(validation.discountAmount || 0) + Number(validation.shippingDiscount || 0),
  discountAmount: Number(validation.discountAmount || 0),
  shippingDiscount: Number(validation.shippingDiscount || 0),
  source,
});

const getAvailableCoupons = async ({ userId, subtotal = 0, shippingFee = 0 }) => {
  const cacheKey = availableCouponCacheKey({ userId, subtotal, shippingFee });
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const orderAmount = Number(subtotal);
  const fee = Number(shippingFee);
  const result = [];
  const seenCodes = new Set();
  const now = new Date();

  const publicCoupons = await Coupon.find({
    scope: "global",
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  for (const coupon of publicCoupons) {
    const validation = await validateCouponForUser({
      userId,
      code: coupon.code,
      orderAmount,
      shippingFee: fee,
    });

    if (!validation.valid) continue;
    seenCodes.add(coupon.code);
    result.push(availableCouponDto({ coupon, validation, source: "public" }));
  }

  const assignedCoupons = await UserCoupon.find({
    userId,
    status: "active",
  })
    .populate("couponId")
    .sort({ createdAt: -1 });

  for (const userCoupon of assignedCoupons) {
    const coupon = userCoupon.couponId;
    if (!coupon || seenCodes.has(coupon.code)) continue;
    if (!assignedScopes.includes(coupon.scope)) continue;

    const validation = await validateCouponForUser({
      userId,
      code: coupon.code,
      orderAmount,
      shippingFee: fee,
    });

    if (!validation.valid) continue;
    seenCodes.add(coupon.code);
    result.push(
      availableCouponDto({
        coupon,
        validation,
        source: "assigned",
        userCouponId: userCoupon._id,
      }),
    );
  }

  await setJson(cacheKey, result, AVAILABLE_COUPON_TTL_SECONDS);
  return result;
};

const sendCouponAssignedNotification = async ({
  email,
  fullName,
  couponCode,
  discountValue,
  type,
  expiresAt,
}) => {
  await axios.post(
    `${notificationServiceUrl}/api/notifications/coupon-assigned`,
    {
      email,
      fullName,
      couponCode,
      discountValue,
      type,
      expiresAt,
    },
    {
      timeout: notificationServiceTimeoutMs,
    },
  );
};

// ─── Admin: create coupon ────────────────────────────────────────────────────

const createCoupon = async (adminId, payload) => {
  const existing = await Coupon.findOne({ code: payload.code });
  if (existing) throw createError("Coupon code already exists", 409);

  const coupon = await Coupon.create({ ...payload, createdBy: adminId });
  await invalidateCouponCache();
  return coupon;
};

// ─── Admin: list all coupons ─────────────────────────────────────────────────

const listCoupons = async () => {
  return Coupon.find().sort({ createdAt: -1 });
};

const getCouponsByIds = async (couponIds = []) => {
  const uniqueIds = [...new Set(couponIds.map((id) => id.toString()))];
  const coupons = await Coupon.find({ _id: { $in: uniqueIds } });
  const couponMap = new Map(coupons.map((coupon) => [coupon._id.toString(), coupon]));

  return uniqueIds
    .map((id) => couponMap.get(id))
    .filter(Boolean)
    .map(publicCouponDto);
};

// ─── Admin: disable coupon ───────────────────────────────────────────────────

const disableCoupon = async (couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw createError("Coupon not found", 404);

  coupon.isActive = false;
  await coupon.save();
  await invalidateCouponCache();
  return coupon;
};

// ─── Admin: assign coupon to user ────────────────────────────────────────────

const assignCoupon = async ({ couponId, userId }) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw createError("Coupon not found", 404);
  if (!coupon.isActive) throw createError("Coupon is disabled", 400);
  if (isCouponExpired(coupon)) throw createError("Coupon has expired", 400);

  // Verify user exists via user-service
  const user = await fetchUser(userId);

  const userCoupon = await UserCoupon.findOneAndUpdate(
    { userId, couponId },
    {
      userId,
      couponId,
      assignedBy: "admin",
      source: "admin_gift",
      assignedAt: new Date(),
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Keep assignment successful even if notification fails.
  try {
    await sendCouponAssignedNotification({
      email: user.email,
      fullName: user.fullName,
      couponCode: coupon.code,
      discountValue: coupon.discountValue,
      type: coupon.type,
      expiresAt: coupon.expiresAt,
    });

    userCoupon.notifiedAt = new Date();
    await userCoupon.save();
  } catch (error) {
    console.warn(
      `[coupon-service] Failed to send coupon assignment email for user ${userId}: ${error.message}`,
    );
  }

  await invalidateCouponCache();
  return userCoupon;
};

const assignCouponInternal = async ({
  couponId,
  userId,
  assignedBy = "system",
  source,
  expiresAt = null,
}) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw createError("Coupon not found", 404);
  if (!coupon.isActive) throw createError("Coupon is disabled", 400);
  if (isCouponExpired(coupon)) throw createError("Coupon has expired", 400);

  const existing = await UserCoupon.findOne({ userId, couponId });
  if (existing && isUserCouponActiveNow(existing, coupon)) {
    return existing;
  }

  const userCoupon = await UserCoupon.findOneAndUpdate(
    { userId, couponId },
    {
      userId,
      couponId,
      assignedBy,
      source,
      assignedAt: new Date(),
      expiresAt,
      status: "active",
      usedAt: null,
      orderId: null,
      discountAmount: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await invalidateCouponCache();
  return userCoupon;
};

// ─── User: get my coupons ────────────────────────────────────────────────────

const getMyCoupons = async (userId, filters = {}) => {
  const now = new Date();

  // Auto-expire stale active records whose coupon has passed expiry
  // (lazy expiry — no cron needed for basic use)
  const userCoupons = await UserCoupon.find({ userId }).populate("couponId");

  const result = [];

  for (const uc of userCoupons) {
    const coupon = uc.couponId;
    if (!coupon) continue;

    // Lazily mark as expired
    if (
      uc.status === "active" &&
      (!coupon.isActive || isCouponExpired(coupon, now) || (uc.expiresAt && uc.expiresAt <= now))
    ) {
      uc.status = "expired";
      await uc.save();
    }

    const dto = {
      _id: uc._id,
      status: uc.status,
      assignedBy: uc.assignedBy,
      source: uc.source,
      assignedAt: uc.assignedAt,
      expiresAt: uc.expiresAt,
      createdAt: uc.createdAt,
      coupon: publicCouponDto(coupon),
    };

    if (filters.onlyUsable) {
      const validation = await validateCouponForUser({
        userId,
        code: coupon.code,
        orderAmount: filters.orderAmount || 0,
        shippingFee: filters.shippingFee || 0,
      });
      if (!validation.valid) continue;
      dto.validation = validation;
    }

    result.push(dto);
  }

  return result;
};

const getPublicCoupons = async ({ userId, orderAmount = 0, shippingFee = 0 }) => {
  const cacheKey = `${PUBLIC_COUPON_CACHE_KEY}:${userId || "guest"}:${Number(orderAmount)}:${Number(shippingFee)}`;
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const coupons = await Coupon.find({
    scope: "global",
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  const result = [];
  for (const coupon of coupons) {
    const validation = await validateCouponForUser({
      userId,
      code: coupon.code,
      orderAmount,
      shippingFee,
    });
    if (!validation.valid) continue;
    result.push({ coupon: publicCouponDto(coupon), validation });
  }

  await setJson(cacheKey, result, PUBLIC_COUPON_TTL_SECONDS);
  return result;
};

const validateCoupon = async ({ userId, code, orderAmount, shippingFee }) =>
  validateCouponForUser({ userId, code, orderAmount, shippingFee });

const markCouponUsed = async ({ userId, code, orderId, orderAmount, shippingFee, discountAmount = 0 }) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw createError("Coupon not found", 404);
  if (!isCouponActiveNow(coupon)) throw createError("Coupon is inactive or expired", 400);

  if (assignedScopes.includes(coupon.scope)) {
    const activeAssignment = await UserCoupon.findOne({
      userId,
      couponId: coupon._id,
      status: "active",
    });
    if (!isUserCouponActiveNow(activeAssignment, coupon)) {
      throw createError("This coupon is not available for your account", 403);
    }
  }

  const usedByUser = await UserCoupon.countDocuments({
    userId,
    couponId: coupon._id,
    status: "used",
  });
  if (usedByUser >= Number(coupon.perUserLimit || 1)) {
    throw createError("You have reached the usage limit for this coupon", 400);
  }

  coupon.usedCount += 1;
  await coupon.save();

  const usagePayload = {
    userId,
    couponId: coupon._id,
    status: "used",
    usedAt: new Date(),
    orderId,
    discountAmount,
  };
  if (coupon.scope === "global") {
    usagePayload.assignedBy = "system";
    usagePayload.source = "admin_gift";
  }

  const userCoupon = await UserCoupon.findOneAndUpdate(
    { userId, couponId: coupon._id },
    usagePayload,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await invalidateCouponCache();
  return { coupon, userCoupon };
};

// ─── Birthday coupon logic ───────────────────────────────────────────────────

/**
 * Assigns a birthday coupon to a user.
 * Called by admin or a scheduled job (future: cron in user-service or here).
 *
 * Strategy:
 *   1. Find or create a "birthday" scoped coupon template for the current year.
 *   2. Assign it to the user.
 *
 * The coupon is valid for 30 days from the user's birthday.
 */
const assignBirthdayCoupon = async ({ userId, adminId }) => {
  const user = await fetchUser(userId);

  if (!user.dateOfBirth) {
    throw createError("User does not have a date of birth set", 400);
  }

  const dob = new Date(user.dateOfBirth);
  const now = new Date();
  const year = now.getFullYear();

  // Birthday this year
  const birthdayThisYear = new Date(year, dob.getMonth(), dob.getDate());
  const expiresAt = new Date(birthdayThisYear);
  expiresAt.setDate(expiresAt.getDate() + 30);

  if (expiresAt <= now) {
    throw createError("User's birthday coupon window has already passed for this year", 400);
  }

  // Reuse or create a birthday coupon for this user+year
  const code = `BDAY-${userId.toString().slice(-6).toUpperCase()}-${year}`;

  let coupon = await Coupon.findOne({ code });
  if (!coupon) {
    coupon = await Coupon.create({
      code,
      description: `Happy Birthday! 20% off your order.`,
      type: "percentage",
      discountValue: 20,
      scope: "birthday",
      expiresAt,
      createdBy: adminId,
    });
  }

  const userCoupon = await UserCoupon.findOneAndUpdate(
    { userId, couponId: coupon._id },
    {
      userId,
      couponId: coupon._id,
      assignedBy: "system",
      source: "birthday",
      assignedAt: new Date(),
      status: "active",
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await invalidateCouponCache();
  return { coupon, userCoupon };
};

module.exports = {
  createCoupon,
  listCoupons,
  getCouponsByIds,
  disableCoupon,
  assignCoupon,
  assignCouponInternal,
  getMyCoupons,
  getPublicCoupons,
  getAvailableCoupons,
  validateCoupon,
  markCouponUsed,
  assignBirthdayCoupon,
};

