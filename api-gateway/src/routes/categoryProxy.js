const express = require("express");
const { categoryServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use(
  "/",
  createServiceProxy({
    serviceName: "category-service",
    target: categoryServiceUrl,
    gatewayPrefix: "/api/categories",
    upstreamPrefix: "/api/categories",
  }),
);

module.exports = router;
