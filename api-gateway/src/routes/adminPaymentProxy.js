const express = require("express");
const { paymentServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "payment-service",
    target: paymentServiceUrl,
    gatewayPrefix: "/api/admin/payments",
    upstreamPrefix: "/api/admin/payments",
  }),
);

module.exports = router;
