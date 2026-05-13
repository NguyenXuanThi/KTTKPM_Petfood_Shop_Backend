const express = require("express");
const { aiServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "ai-service",
    target: aiServiceUrl,
    gatewayPrefix: "/api/ai",
    upstreamPrefix: "/api",
  }),
);

module.exports = router;
