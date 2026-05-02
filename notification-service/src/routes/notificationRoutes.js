const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.post(
  "/email/reactivation-request",
  notificationController.sendReactivationRequest,
);

module.exports = router;
