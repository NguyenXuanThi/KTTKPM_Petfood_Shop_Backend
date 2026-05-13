const express = require("express");
const { couponServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "coupon-service",
    target: couponServiceUrl,
    gatewayPrefix: "/api/coupons",
    upstreamPrefix: "/api/coupons",
  }),
);

module.exports = router;
