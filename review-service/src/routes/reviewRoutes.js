const express = require("express");
const reviewController = require("../controllers/reviewController");
const { optionalAuth, requireAuth, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/products/:productId/reviews", optionalAuth, reviewController.listProductReviews);

router.post("/reviews", requireAuth, reviewController.createReview);
router.patch("/reviews/:id", requireAuth, reviewController.updateReview);
router.delete("/reviews/:id", requireAuth, reviewController.deleteReview);

router.get("/admin/reviews", requireAuth, requireAdmin, reviewController.listAdminReviews);
router.patch("/admin/reviews/:id/hide", requireAuth, requireAdmin, reviewController.hideReview);
router.patch("/admin/reviews/:id/show", requireAuth, requireAdmin, reviewController.showReview);
router.delete("/admin/reviews/:id", requireAuth, requireAdmin, reviewController.deleteReview);

module.exports = router;
