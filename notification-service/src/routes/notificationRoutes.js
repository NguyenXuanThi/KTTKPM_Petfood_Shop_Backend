const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.post(
  "/email/reactivation-request",
  notificationController.sendReactivationRequest,
);
router.post("/coupon-assigned", notificationController.sendCouponAssigned);

module.exports = router;
