const express = require("express");
const { appointmentServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "appointment-service",
    target: appointmentServiceUrl,
    gatewayPrefix: "/api/appointments",
    upstreamPrefix: "/api/appointments",
  }),
);

module.exports = router;
