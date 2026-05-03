const mongoose = require("mongoose");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { getUserSnapshot } = require("./userClient");

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const ensureObjectId = (id, message) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const ensureActiveProduct = async (productId) => {
  ensureObjectId(productId, "Invalid product id");

  const product = await Product.findOne({ _id: productId, isActive: true });

  if (!product) {
    const error = new Error("Product not found or inactive");
    error.statusCode = 404;
    throw error;
  }

  return product;
};

const formatReview = (reviewDoc) => {
  if (!reviewDoc) return null;

  const review = reviewDoc.toObject ? reviewDoc.toObject() : reviewDoc;

  return {
    ...review,
    _id: review._id.toString(),
    productId: review.productId.toString(),
    userId: review.userId.toString(),
  };
};

const getVisibleReviewSummary = async (productId) => {
  ensureObjectId(productId, "Invalid product id");

  const [summary] = await Review.aggregate([
    {
      $match: {
        productId: toObjectId(productId),
        status: "visible",
      },
    },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return {
    averageRating: summary?.averageRating
      ? Number(summary.averageRating.toFixed(1))
      : 0,
    totalReviews: summary?.totalReviews || 0,
  };
};

const listProductReviews = async (productId, viewerUserId = null) => {
  await ensureActiveProduct(productId);

  const [reviews, summary, myReview] = await Promise.all([
    Review.find({ productId, status: "visible" }).sort({ createdAt: -1 }).lean(),
    getVisibleReviewSummary(productId),
    viewerUserId ? Review.findOne({ productId, userId: viewerUserId }).lean() : null,
  ]);

  return {
    reviews: reviews.map((review) => formatReview(review)),
    summary,
    myReview: myReview ? formatReview(myReview) : null,
  };
};

const upsertReview = async (productId, userId, payload) => {
  await ensureActiveProduct(productId);
  ensureObjectId(userId, "Invalid user id");

  const userSnapshot = await getUserSnapshot(userId);
  const existingReview = await Review.findOne({ productId, userId });

  if (existingReview) {
    existingReview.rating = payload.rating;
    existingReview.comment = payload.comment;
    existingReview.fullName = userSnapshot.fullName;
    existingReview.avatarUrl = userSnapshot.avatarUrl;
    // Future: do not auto-reset moderation/verified state without explicit review workflow.
    await existingReview.save();
    return formatReview(existingReview);
  }

  const review = await Review.create({
    productId,
    userId,
    fullName: userSnapshot.fullName,
    avatarUrl: userSnapshot.avatarUrl,
    rating: payload.rating,
    comment: payload.comment,
    verifiedPurchase: false, // Future: set true after order-service confirms purchase.
  });

  return formatReview(review);
};

const getReviewById = async (reviewId) => {
  ensureObjectId(reviewId, "Invalid review id");

  const review = await Review.findById(reviewId);

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  return review;
};

const updateReview = async (reviewId, userId, payload) => {
  const review = await getReviewById(reviewId);

  if (review.userId.toString() !== userId) {
    const error = new Error("You can only edit your own review");
    error.statusCode = 403;
    throw error;
  }

  await ensureActiveProduct(review.productId.toString());
  const userSnapshot = await getUserSnapshot(userId);

  if (payload.rating !== undefined) review.rating = payload.rating;
  if (payload.comment !== undefined) review.comment = payload.comment;
  review.fullName = userSnapshot.fullName;
  review.avatarUrl = userSnapshot.avatarUrl;
  // Future: AI moderation hook can inspect updated comment before save.
  await review.save();

  return formatReview(review);
};

const deleteReview = async (reviewId, auth) => {
  const review = await getReviewById(reviewId);
  const isOwner = review.userId.toString() === auth.sub;
  const isAdmin = auth.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You are not allowed to delete this review");
    error.statusCode = 403;
    throw error;
  }

  await Review.deleteOne({ _id: reviewId });
  return formatReview(review);
};

const setReviewVisibility = async (reviewId, status) => {
  const review = await getReviewById(reviewId);
  review.status = status;
  await review.save();
  return formatReview(review);
};

const deleteReviewsByProductId = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    return;
  }

  await Review.deleteMany({ productId });
};

module.exports = {
  getVisibleReviewSummary,
  listProductReviews,
  upsertReview,
  updateReview,
  deleteReview,
  setReviewVisibility,
  deleteReviewsByProductId,
};