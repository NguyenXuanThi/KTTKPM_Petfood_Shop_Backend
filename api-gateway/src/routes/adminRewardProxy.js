const express = require("express");
const { rewardServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "reward-service",
    target: rewardServiceUrl,
    gatewayPrefix: "/api/admin/rewards",
    upstreamPrefix: "/api/admin/rewards",
  }),
);

module.exports = router;
