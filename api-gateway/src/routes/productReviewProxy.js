const express = require("express");
const { reviewServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "review-service",
    target: reviewServiceUrl,
    gatewayPrefix: "/api/products",
    upstreamPrefix: "/api/products",
  }),
);

module.exports = router;
