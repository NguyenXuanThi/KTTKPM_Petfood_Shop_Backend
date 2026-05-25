const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.post(
  "/email/reactivation-request",
  notificationController.sendReactivationRequest,
);
router.post("/coupon-assigned", notificationController.sendCouponAssigned);
router.post(
  "/password-reset-otp",
  notificationController.sendPasswordResetOtp,
);

module.exports = router;
