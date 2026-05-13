const express = require("express");
const orderController = require("../controllers/orderController");
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

// Admin APIs
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

// Internal API for payment-service
router.patch(
  "/internal/orders/:id/payment-status",
  requireInternal,
  orderController.updatePaymentStatusInternal,
);

module.exports = router;
