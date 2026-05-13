const express = require("express");
const paymentController = require("../controllers/paymentController");
const { requireUserAuth, requireAdmin } = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

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

module.exports = router;
