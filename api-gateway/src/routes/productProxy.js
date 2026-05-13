const express = require("express");
const { productServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "product-service",
    target: productServiceUrl,
    gatewayPrefix: "/api/products",
    upstreamPrefix: "/api/products",
  }),
);

module.exports = router;
