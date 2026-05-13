const express = require("express");
const couponController = require("../controllers/couponController");
const { requireUserAuth, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Admin routes
router.get("/", requireUserAuth, requireAdmin, couponController.listCoupons);
router.post("/", requireUserAuth, requireAdmin, couponController.createCoupon);
router.patch("/:id/disable", requireUserAuth, requireAdmin, couponController.disableCoupon);
router.post("/assign", requireUserAuth, requireAdmin, couponController.assignCoupon);
router.post("/assign/birthday", requireUserAuth, requireAdmin, couponController.assignBirthdayCoupon);

// User routes
router.get("/my", requireUserAuth, couponController.getMyCoupons);

module.exports = router;
