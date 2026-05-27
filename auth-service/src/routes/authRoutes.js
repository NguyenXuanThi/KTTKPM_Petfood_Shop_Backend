const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  loginRateLimiter,
  forgotPasswordIpRateLimiter,
  resetPasswordRateLimiter,
} = require("../middlewares/redisRateLimitMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", loginRateLimiter, authController.login);
router.post("/request-reactivation", authController.requestReactivation);
router.post(
  "/forgot-password",
  forgotPasswordIpRateLimiter,
  authController.forgotPassword,
);
router.post("/reset-password", resetPasswordRateLimiter, authController.resetPassword);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

module.exports = router;
