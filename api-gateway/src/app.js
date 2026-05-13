const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const { corsOrigin, rateLimitWindowMs, rateLimitMax } = require("./config/env");
const { loggerMiddleware } = require("./middlewares/loggerMiddleware");
const { requireAuth } = require("./middlewares/authMiddleware");
const { requireAdmin } = require("./middlewares/adminMiddleware");
const { notFoundHandler, errorHandler } = require("./middlewares/errorMiddleware");

const authProxy = require("./routes/authProxy");
const userProxy = require("./routes/userProxy");
const productProxy = require("./routes/productProxy");
const categoryProxy = require("./routes/categoryProxy");
const cartProxy = require("./routes/cartProxy");
const uploadProxy = require("./routes/uploadProxy");
const couponProxy = require("./routes/couponProxy");
const orderProxy = require("./routes/orderProxy");
const paymentProxy = require("./routes/paymentProxy");
const notificationProxy = require("./routes/notificationProxy");
const adminOrderProxy = require("./routes/adminOrderProxy");
const adminPaymentProxy = require("./routes/adminPaymentProxy");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-internal-key", "x-cart-token"],
  }),
);
app.use(compression());
app.use(loggerMiddleware);

const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const requireAdminOnWriteMethods = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  return requireAuth(req, res, (authErr) => {
    if (authErr) return next(authErr);
    return requireAdmin(req, res, next);
  });
};

const requireAuthForCouponRoutes = (req, res, next) => {
  if (req.method === "GET" && req.path === "/") {
    return next();
  }

  return requireAuth(req, res, next);
};

const requireAdminForCouponManagement = (req, res, next) => {
  const isMyCouponEndpoint = req.method === "GET" && req.path.startsWith("/my");
  if (isMyCouponEndpoint) {
    return next();
  }

  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return requireAdmin(req, res, next);
  }

  return next();
};

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "api-gateway",
    status: "ok",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    gateway: "ok",
    routes: {
      auth: "/api/auth/*",
      users: "/api/users/*",
      products: "/api/products/*",
      categories: "/api/categories/*",
      cart: "/api/cart/*",
      uploads: "/api/uploads/*",
      coupons: "/api/coupons/*",
      orders: "/api/orders/*",
      payments: "/api/payments/*",
      notifications: "/api/notifications/*",
      adminOrders: "/api/admin/orders/*",
      adminPayments: "/api/admin/payments/*",
    },
  });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authProxy);
app.use("/api/products", requireAdminOnWriteMethods, productProxy);
app.use("/api/categories", requireAdminOnWriteMethods, categoryProxy);
app.use("/api/cart", cartProxy);

app.use("/api/users", requireAuth, userProxy);
app.use("/api/orders", requireAuth, orderProxy);
app.use("/api/payments", requireAuth, paymentProxy);
app.use("/api/uploads", requireAuth, uploadProxy);

app.use("/api/coupons", requireAuthForCouponRoutes, requireAdminForCouponManagement, couponProxy);

app.use("/api/admin/orders", requireAuth, requireAdmin, adminOrderProxy);
app.use("/api/admin/payments", requireAuth, requireAdmin, adminPaymentProxy);
app.use("/api/notifications", requireAuth, requireAdmin, notificationProxy);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
