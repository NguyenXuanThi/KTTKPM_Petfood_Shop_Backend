const express = require("express");
const { userServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "user-service",
    target: userServiceUrl,
    gatewayPrefix: "/api/users",
    upstreamPrefix: "/api/users",
  }),
);

module.exports = router;
