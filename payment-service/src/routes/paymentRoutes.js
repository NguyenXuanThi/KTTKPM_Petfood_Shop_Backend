const express = require("express");
const paymentController = require("../controllers/paymentController");
const vnpayController = require("../controllers/vnpayController");
const statisticsController = require("../controllers/statisticsController");
const vnpayController = require("../controllers/vnpayController");
const {
  requireUserAuth,
  requireAdmin,
  requireInternal,
} = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get(
  "/admin/statistics/payments",
  requireUserAuth,
  requireAdmin,
  statisticsController.getPaymentStatistics,
);

router.post(
  "/payments/banking/init",
  requireInternal,
  paymentController.initBankingPayment,
);

router.patch(
  "/payments/banking/order/:orderId/fail",
  requireInternal,
  paymentController.failBankingPaymentByOrder,
);

router.patch(
  "/payments/banking/order/:orderId/expire",
  requireInternal,
  paymentController.expireBankingPaymentByOrder,
);

// VNPay routes
router.post(
  "/payments/vnpay/create",
  requireUserAuth,
  vnpayController.createVnpayPayment,
);

router.get(
  "/payments/vnpay/verify",
  requireUserAuth,
  vnpayController.verifyVnpayReturn,
);

// Banking routes
router.post(
  "/payments/vnpay/init",
  requireInternal,
  vnpayController.initVnpayPayment,
);

router.post(
  "/payments/vnpay/create",
  requireUserAuth,
  vnpayController.createVnpayPayment,
);

router.get(
  "/payments/vnpay/verify",
  requireUserAuth,
  vnpayController.verifyVnpayReturn,
);

router.post(
  "/payments/banking/upload-proof",
  requireUserAuth,
  upload.single("file"),
  paymentController.uploadBankingProof,
);

router.get(
  "/admin/payments/banking/pending",
  requireUserAuth,
  requireAdmin,
  paymentController.listPendingBankingPayments,
);

router.patch(
  "/admin/payments/:id/approve",
  requireUserAuth,
  requireAdmin,
  paymentController.approvePayment,
);

router.patch(
  "/admin/payments/:id/reject",
  requireUserAuth,
  requireAdmin,
  paymentController.rejectPayment,
);

// Compatibility aliases for gateway paths mounted under /api/payments/admin/...
router.get(
  "/payments/admin/payments/banking/pending",
  requireUserAuth,
  requireAdmin,
  paymentController.listPendingBankingPayments,
);

router.patch(
  "/payments/admin/payments/:id/approve",
  requireUserAuth,
  requireAdmin,
  paymentController.approvePayment,
);

router.patch(
  "/payments/admin/payments/:id/reject",
  requireUserAuth,
  requireAdmin,
  paymentController.rejectPayment,
);

module.exports = router;
