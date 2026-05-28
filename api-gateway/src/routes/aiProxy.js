const express = require("express");
const { aiServiceUrl } = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");

const router = express.Router();

router.use((req, _res, next) => {
  if (req.method === "GET" && req.path === "/recommendations/products") {
    console.log(
      `[api-gateway] GET /api/ai/recommendations/products userId=${req.auth?.sub || "guest"} sessionId=${req.headers["x-session-id"] || "n/a"}`,
    );
  }
  next();
});

router.use(
  "/",
  createServiceProxy({
    serviceName: "ai-service",
    target: aiServiceUrl,
    gatewayPrefix: "/api/ai",
    upstreamPrefix: "",
  }),
);

module.exports = router;
