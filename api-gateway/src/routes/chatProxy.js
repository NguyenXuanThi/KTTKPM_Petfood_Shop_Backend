const express = require("express");
const { chatServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "chat-service",
    target: chatServiceUrl,
    gatewayPrefix: "/api/chat",
    upstreamPrefix: "/api/chat",
  }),
);

module.exports = router;
