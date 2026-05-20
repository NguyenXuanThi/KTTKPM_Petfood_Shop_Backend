const express = require("express");
const couponController = require("../controllers/couponController");
const statisticsController = require("../controllers/statisticsController");
const {
  requireUserAuth,
  requireAdmin,
  requireInternal,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Admin routes
router.get(
  "/admin/statistics/coupons",
  requireUserAuth,
  requireAdmin,
  statisticsController.getCouponStatistics,
);
router.get("/", requireUserAuth, requireAdmin, couponController.listCoupons);
router.post("/", requireUserAuth, requireAdmin, couponController.createCoupon);
router.patch("/:id/disable", requireUserAuth, requireAdmin, couponController.disableCoupon);
router.post("/assign", requireUserAuth, requireAdmin, couponController.assignCoupon);
router.post("/assign/birthday", requireUserAuth, requireAdmin, couponController.assignBirthdayCoupon);
router.post("/internal/validate", requireInternal, couponController.validateCoupon);
router.post("/internal/mark-used", requireInternal, couponController.markCouponUsed);

// User routes
router.get("/available", requireUserAuth, couponController.getAvailableCoupons);
router.get("/public", requireUserAuth, couponController.getPublicCoupons);
router.get("/my", requireUserAuth, couponController.getMyCoupons);
router.post("/validate", requireUserAuth, couponController.validateCoupon);

module.exports = router;
