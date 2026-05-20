const express = require("express");
const {
  orderServiceUrl,
  paymentServiceUrl,
  couponServiceUrl,
  userServiceUrl,
  productServiceUrl,
} = require("../config/env");
const { createServiceProxy } = require("../utils/createServiceProxy");
const statisticsController = require("../controllers/statisticsController");

const router = express.Router();

const proxy = ({ serviceName, target, route, upstream }) =>
  createServiceProxy({
    serviceName,
    target,
    gatewayPrefix: `/api/admin/statistics${route}`,
    upstreamPrefix: upstream,
  });

router.get("/dashboard", statisticsController.getDashboardStatistics);
router.get("/products", statisticsController.getProductStatistics);

router.use(
  "/revenue",
  proxy({
    serviceName: "order-service",
    target: orderServiceUrl,
    route: "/revenue",
    upstream: "/api/admin/statistics/revenue",
  }),
);

router.use(
  "/orders",
  proxy({
    serviceName: "order-service",
    target: orderServiceUrl,
    route: "/orders",
    upstream: "/api/admin/statistics/orders",
  }),
);

router.use(
  "/products/top-selling",
  proxy({
    serviceName: "order-service",
    target: orderServiceUrl,
    route: "/products/top-selling",
    upstream: "/api/admin/statistics/products",
  }),
);

router.use(
  "/payments",
  proxy({
    serviceName: "payment-service",
    target: paymentServiceUrl,
    route: "/payments",
    upstream: "/api/admin/statistics/payments",
  }),
);

router.use(
  "/coupons",
  proxy({
    serviceName: "coupon-service",
    target: couponServiceUrl,
    route: "/coupons",
    upstream: "/api/coupons/admin/statistics/coupons",
  }),
);

router.use(
  "/users",
  proxy({
    serviceName: "user-service",
    target: userServiceUrl,
    route: "/users",
    upstream: "/api/users/admin/statistics/users",
  }),
);

module.exports = router;
