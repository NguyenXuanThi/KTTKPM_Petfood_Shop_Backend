const express = require("express");
const { notificationServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "notification-service",
    target: notificationServiceUrl,
    gatewayPrefix: "/api/notifications",
    upstreamPrefix: "/api/notifications",
  }),
);

module.exports = router;
