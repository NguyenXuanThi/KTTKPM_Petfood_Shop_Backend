const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  corsOrigin,
  authServiceUrl,
  productServiceUrl,
  cartServiceUrl,
  categoryServiceUrl,
  uploadServiceUrl,
  userServiceUrl,
  rateLimitWindowMs,
  rateLimitMax,
} = require("./config/env");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

const createServiceProxy = (serviceName, target, prefixPath) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 30000,
    timeout: 30000,
    pathRewrite: (path) => `${prefixPath}${path === "/" ? "" : path}`,
    on: {
      error: (error, req, res) => {
        if (!res.headersSent) {
          res.status(502).json({
            message: `${serviceName} is unavailable`,
            error: error.message,
          });
        }
      },
    },
  });

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "api-gateway",
    status: "ok",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    gateway: "ok",
    routes: {
      auth: "/api/auth/*",
      product: "/api/products/*",
      cart: "/api/cart/*",
      category: "/api/categories/*",
      users: "/api/users/*",
    },
  });
});

app.use("/api", apiLimiter);
app.use(
  "/api/auth",
  createServiceProxy("auth-service", authServiceUrl, "/api/auth"),
);
app.use(
  "/api/products",
  createServiceProxy("product-service", productServiceUrl, "/api/products"),
);
app.use(
  "/api/cart",
  createServiceProxy("cart-service", cartServiceUrl, "/api/cart"),
);
app.use(
  "/api/categories",
  createServiceProxy("category-service", categoryServiceUrl, "/api/categories"),
);
app.use(
  "/api/upload",
  createServiceProxy("upload-service", uploadServiceUrl, "/api/upload"),
);
app.use(
  "/api/users",
  createServiceProxy("user-service", userServiceUrl, "/api/users"),
);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found in gateway",
  });
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
});

module.exports = app;
