const express = require("express");
const userController = require("../controllers/userController");
const wishlistController = require("../controllers/wishlistController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");

const router = express.Router();

// User self-service endpoints
router.get("/me", requireAuth, userController.getMe);
router.patch("/me", requireAuth, userController.updateMe);
router.patch("/me/password", requireAuth, userController.changeMyPassword);
router.get("/me/wishlist", requireAuth, wishlistController.getMyWishlist);
router.get(
  "/me/wishlist/check/:productId",
  requireAuth,
  wishlistController.checkMyWishlistItem,
);
router.post(
  "/me/wishlist/items",
  requireAuth,
  wishlistController.addToMyWishlist,
);
router.delete(
  "/me/wishlist/items/:productId",
  requireAuth,
  wishlistController.removeFromMyWishlist,
);

// Admin endpoints
router.get("/", requireAuth, requireAdmin, userController.listUsers);
router.patch(
  "/:id/role",
  requireAuth,
  requireAdmin,
  userController.updateUserRole,
);
router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  userController.updateUserStatus,
);
router.patch(
  "/:id/deactivate",
  requireAuth,
  requireAdmin,
  userController.deactivateUser,
);
router.patch(
  "/:id/activate",
  requireAuth,
  requireAdmin,
  userController.activateUser,
);
router.patch(
  "/:id/restore",
  requireAuth,
  requireAdmin,
  userController.restoreUser,
);

// Internal/auth-service endpoints
router.post("/", userController.createUser);
router.get("/email/:email", userController.getUserByEmail);
router.get("/internal/:id", userController.getInternalUserById);
router.patch("/:id/last-login", userController.markLastLogin);
router.patch(
  "/:id/reactivation-request",
  userController.markReactivationRequested,
);
router.get("/:id", userController.getUserById);

module.exports = router;
