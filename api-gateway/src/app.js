const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const { corsOrigin } = require("./config/env");
const { loggerMiddleware } = require("./middlewares/loggerMiddleware");
const { apiRateLimiter } = require("./middlewares/redisRateLimitMiddleware");
const { requireAuth } = require("./middlewares/authMiddleware");
const { requireAdmin } = require("./middlewares/adminMiddleware");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/errorMiddleware");

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
const reviewProxy = require("./routes/reviewProxy");
const adminReviewProxy = require("./routes/adminReviewProxy");
const productReviewProxy = require("./routes/productReviewProxy");
const statisticsProxy = require("./routes/statisticsProxy");
const rewardProxy = require("./routes/rewardProxy");
const adminRewardProxy = require("./routes/adminRewardProxy");
// const aiProxy = require("./routes/aiProxy");
const chatProxy = require("./routes/chatProxy");
const appointmentProxy = require("./routes/appointmentProxy");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-internal-key",
      "x-cart-token",
    ],
  }),
);
app.use(compression());
app.use(loggerMiddleware);

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
  const couponPath = req.path.startsWith("/api/coupons")
    ? req.path.replace("/api/coupons", "") || "/"
    : req.path;
  const userAllowedRoutes = [
    req.method === "GET" && couponPath.startsWith("/my"),
    req.method === "GET" && couponPath.startsWith("/public"),
    req.method === "GET" && couponPath.startsWith("/available"),
    req.method === "POST" && couponPath === "/validate",
  ];

  if (userAllowedRoutes.some(Boolean)) {
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
      reviews: "/api/reviews/*",
      rewards: "/api/rewards/*",
      productReviews: "/api/products/:productId/reviews",
      adminOrders: "/api/admin/orders/*",
      adminPayments: "/api/admin/payments/*",
      adminReviews: "/api/admin/reviews/*",
      adminRewards: "/api/admin/rewards/*",
      appointments: "/api/appointments/*",
    },
  });
});

app.use("/api", apiRateLimiter);

app.use("/api/auth", authProxy);
app.use("/api/products/:productId/reviews", productReviewProxy);
app.use("/api/products", requireAdminOnWriteMethods, productProxy);
app.use("/api/categories", requireAdminOnWriteMethods, categoryProxy);
app.use("/api/cart", cartProxy);

app.use("/api/users", requireAuth, userProxy);
app.use("/api/orders", requireAuth, orderProxy);
app.use("/api/payments", requireAuth, paymentProxy);
app.use("/api/uploads", requireAuth, uploadProxy);
app.use("/api/reviews", requireAuth, reviewProxy);
app.use("/api/rewards", requireAuth, rewardProxy);
app.use("/api/notifications/password-reset-otp", notificationProxy);

app.use(
  "/api/coupons",
  requireAuthForCouponRoutes,
  requireAdminForCouponManagement,
  couponProxy,
);

app.use("/api/admin/statistics", requireAuth, requireAdmin, statisticsProxy);
app.use("/api/admin/orders", requireAuth, requireAdmin, adminOrderProxy);
app.use("/api/admin/payments", requireAuth, requireAdmin, adminPaymentProxy);
app.use("/api/admin/reviews", requireAuth, requireAdmin, adminReviewProxy);
app.use("/api/admin/rewards", requireAuth, requireAdmin, adminRewardProxy);
app.use("/api/notifications", requireAuth, requireAdmin, notificationProxy);
app.use("/api/appointments", appointmentProxy);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
