const axios = require("axios");
const Coupon = require("../models/Coupon");
const UserCoupon = require("../models/UserCoupon");
const {
  userServiceUrl,
  userServiceTimeoutMs,
  notificationServiceUrl,
  notificationServiceTimeoutMs,
} = require("../config/env");

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
  return coupon;
};

// ─── Admin: list all coupons ─────────────────────────────────────────────────

const listCoupons = async () => {
  return Coupon.find().sort({ createdAt: -1 });
};

// ─── Admin: disable coupon ───────────────────────────────────────────────────

const disableCoupon = async (couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw createError("Coupon not found", 404);

  coupon.isActive = false;
  await coupon.save();
  return coupon;
};

// ─── Admin: assign coupon to user ────────────────────────────────────────────

const assignCoupon = async ({ couponId, userId }) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw createError("Coupon not found", 404);
  if (!coupon.isActive) throw createError("Coupon is disabled", 400);
  if (coupon.expiresAt <= new Date()) throw createError("Coupon has expired", 400);

  // Verify user exists via user-service
  const user = await fetchUser(userId);

  const userCoupon = await UserCoupon.findOneAndUpdate(
    { userId, couponId },
    { userId, couponId, assignedBy: "admin", status: "active" },
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

  return userCoupon;
};

// ─── User: get my coupons ────────────────────────────────────────────────────

const getMyCoupons = async (userId) => {
  const now = new Date();

  // Auto-expire stale active records whose coupon has passed expiry
  // (lazy expiry — no cron needed for basic use)
  const userCoupons = await UserCoupon.find({ userId }).populate("couponId");

  const result = [];

  for (const uc of userCoupons) {
    const coupon = uc.couponId;
    if (!coupon) continue;

    // Lazily mark as expired
    if (uc.status === "active" && (!coupon.isActive || coupon.expiresAt <= now)) {
      uc.status = "expired";
      await uc.save();
    }

    result.push({
      _id: uc._id,
      status: uc.status,
      assignedBy: uc.assignedBy,
      createdAt: uc.createdAt,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        scope: coupon.scope,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive,
      },
    });
  }

  return result;
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
    { userId, couponId: coupon._id, assignedBy: "system", status: "active" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { coupon, userCoupon };
};

module.exports = {
  createCoupon,
  listCoupons,
  disableCoupon,
  assignCoupon,
  getMyCoupons,
  assignBirthdayCoupon,
};
