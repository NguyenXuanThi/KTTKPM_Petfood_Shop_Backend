const express = require("express");
const { authServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "auth-service",
    target: authServiceUrl,
    gatewayPrefix: "/api/auth",
    upstreamPrefix: "/api/auth",
  }),
);

module.exports = router;
