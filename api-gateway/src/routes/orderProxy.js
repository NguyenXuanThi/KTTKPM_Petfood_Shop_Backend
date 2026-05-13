const express = require("express");
const { orderServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "order-service",
    target: orderServiceUrl,
    gatewayPrefix: "/api/orders",
    upstreamPrefix: "/api/orders",
  }),
);

module.exports = router;
