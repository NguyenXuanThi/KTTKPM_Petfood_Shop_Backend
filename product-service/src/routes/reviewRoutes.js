const express = require("express");
const reviewController = require("../controllers/reviewController");
const { optionalAuth, requireAuth } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/:productId/reviews", optionalAuth, reviewController.listProductReviews);
router.post("/:productId/reviews", requireAuth, reviewController.createOrUpdateReview);
router.patch("/reviews/:reviewId", requireAuth, reviewController.updateReview);
router.delete("/reviews/:reviewId", requireAuth, reviewController.deleteReview);
router.patch("/reviews/:reviewId/hide", requireAuth, requireAdmin, reviewController.hideReview);
router.patch("/reviews/:reviewId/show", requireAuth, requireAdmin, reviewController.showReview);

module.exports = router;