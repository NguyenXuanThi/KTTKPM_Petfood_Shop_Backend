const express = require("express");
const { uploadServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "upload-service",
    target: uploadServiceUrl,
    gatewayPrefix: "/api/uploads",
    upstreamPrefix: "/api/upload",
  }),
);

module.exports = router;
