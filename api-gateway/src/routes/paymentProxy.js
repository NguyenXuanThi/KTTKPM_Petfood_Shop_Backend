const express = require("express");
const { paymentServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "payment-service",
    target: paymentServiceUrl,
    gatewayPrefix: "/api/payments",
    upstreamPrefix: "/api/payments",
  }),
);

module.exports = router;
