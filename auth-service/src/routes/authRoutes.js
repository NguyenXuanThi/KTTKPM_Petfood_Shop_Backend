const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  forgotPasswordRateLimiter,
} = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/request-reactivation", authController.requestReactivation);
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  authController.forgotPassword,
);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

module.exports = router;
