const express = require("express");
const { cartServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "cart-service",
    target: cartServiceUrl,
    gatewayPrefix: "/api/cart",
    upstreamPrefix: "/api/cart",
  }),
);

module.exports = router;
