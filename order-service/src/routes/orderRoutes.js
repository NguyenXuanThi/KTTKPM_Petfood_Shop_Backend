const express = require("express");
const orderController = require("../controllers/orderController");
const statisticsController = require("../controllers/statisticsController");
const {
  requireUserAuth,
  requireAdmin,
  requireInternal,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// User APIs
router.post("/orders", requireUserAuth, orderController.createOrder);
router.get("/orders/my", requireUserAuth, orderController.getMyOrders);
router.get(
  "/orders/my/shipping",
  requireUserAuth,
  orderController.getMyShippingOrders,
);
router.get("/orders/:id", requireUserAuth, orderController.getOrderById);
router.patch(
  "/orders/:id/cancel",
  requireUserAuth,
  orderController.cancelMyBankingOrder,
);
router.patch(
  "/orders/:id/cancel-unpaid-banking",
  requireUserAuth,
  orderController.cancelMyBankingOrder,
);

// Admin APIs
router.get(
  "/admin/statistics/revenue",
  requireUserAuth,
  requireAdmin,
  statisticsController.getRevenueStatistics,
);
router.get(
  "/admin/statistics/orders",
  requireUserAuth,
  requireAdmin,
  statisticsController.getOrderStatistics,
);
router.get(
  "/admin/statistics/products",
  requireUserAuth,
  requireAdmin,
  statisticsController.getProductStatistics,
);
router.get(
  "/admin/statistics/dashboard",
  requireUserAuth,
  requireAdmin,
  statisticsController.getDashboardStatistics,
);
router.get("/admin/orders", requireUserAuth, requireAdmin, orderController.listAdminOrders);
router.get(
  "/admin/orders/pending",
  requireUserAuth,
  requireAdmin,
  orderController.listPendingOrders,
);
router.patch(
  "/admin/orders/:id/confirm",
  requireUserAuth,
  requireAdmin,
  orderController.confirmOrder,
);
router.patch(
  "/admin/orders/:id/shipping",
  requireUserAuth,
  requireAdmin,
  orderController.markShipping,
);
router.patch(
  "/admin/orders/:id/delivered",
  requireUserAuth,
  requireAdmin,
  orderController.markDelivered,
);
router.patch(
  "/admin/orders/:id/completed",
  requireUserAuth,
  requireAdmin,
  orderController.markCompleted,
);
router.patch(
  "/admin/orders/:id/cancel",
  requireUserAuth,
  requireAdmin,
  orderController.cancelOrder,
);
router.patch(
  "/admin/orders/:id/payment-status",
  requireUserAuth,
  requireAdmin,
  orderController.updateCodPaymentStatus,
);

// Compatibility aliases for gateway paths mounted under /api/orders/admin/...
router.get("/orders/admin/orders", requireUserAuth, requireAdmin, orderController.listAdminOrders);
router.get(
  "/orders/admin/orders/pending",
  requireUserAuth,
  requireAdmin,
  orderController.listPendingOrders,
);
router.patch(
  "/orders/admin/orders/:id/confirm",
  requireUserAuth,
  requireAdmin,
  orderController.confirmOrder,
);
router.patch(
  "/orders/admin/orders/:id/shipping",
  requireUserAuth,
  requireAdmin,
  orderController.markShipping,
);
router.patch(
  "/orders/admin/orders/:id/delivered",
  requireUserAuth,
  requireAdmin,
  orderController.markDelivered,
);
router.patch(
  "/orders/admin/orders/:id/completed",
  requireUserAuth,
  requireAdmin,
  orderController.markCompleted,
);
router.patch(
  "/orders/admin/orders/:id/cancel",
  requireUserAuth,
  requireAdmin,
  orderController.cancelOrder,
);
router.patch(
  "/orders/admin/orders/:id/payment-status",
  requireUserAuth,
  requireAdmin,
  orderController.updateCodPaymentStatus,
);

// Internal API for payment-service
router.patch(
  "/internal/orders/:id/payment-status",
  requireInternal,
  orderController.updatePaymentStatusInternal,
);

module.exports = router;
