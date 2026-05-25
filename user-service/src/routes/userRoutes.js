const express = require("express");
const userController = require("../controllers/userController");
const wishlistController = require("../controllers/wishlistController");
const addressController = require("../controllers/addressController");
const statisticsController = require("../controllers/statisticsController");
const { requireAuth, requireInternal } = require("../middlewares/authMiddleware");
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

// User address endpoints
router.get("/addresses", requireAuth, addressController.listMyAddresses);
router.post("/addresses", requireAuth, addressController.createAddress);
router.patch("/addresses/:id", requireAuth, addressController.updateAddress);
router.patch(
  "/addresses/:id/default",
  requireAuth,
  addressController.setDefaultAddress,
);
router.delete("/addresses/:id", requireAuth, addressController.deleteAddress);

// Internal endpoint for order-service checkout snapshot
router.get(
  "/addresses/:id/internal",
  requireInternal,
  addressController.getAddressInternal,
);

// Admin endpoints
router.get(
  "/admin/statistics/users",
  requireAuth,
  requireAdmin,
  statisticsController.getUserStatistics,
);
router.get("/", requireAuth, requireAdmin, userController.listUsers);
router.get("/search", requireAuth, requireAdmin, userController.searchUsers);
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
router.patch("/:id/password/reset", requireInternal, userController.resetPassword);
router.patch(
  "/:id/reactivation-request",
  userController.markReactivationRequested,
);
router.get("/:id", userController.getUserById);

module.exports = router;
