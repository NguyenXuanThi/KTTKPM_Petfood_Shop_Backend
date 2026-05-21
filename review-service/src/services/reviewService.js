const mongoose = require("mongoose");
const Review = require("../models/Review");
const {
  checkReviewEligibility,
  updateProductRatingSummary,
  getUserSnapshot,
} = require("./serviceClients");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureObjectId = (id, message = "Invalid id") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(message, 400);
  }
};

const emptyBreakdown = () => ({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

const calculateProductSummary = async (productId) => {
  ensureObjectId(productId, "Invalid product id");

  const rows = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: "visible" } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
        ratingSum: { $sum: "$rating" },
      },
    },
  ]);

  const ratingBreakdown = emptyBreakdown();
  let totalReviews = 0;
  let ratingSum = 0;

  rows.forEach((row) => {
    ratingBreakdown[row._id] = row.count;
    totalReviews += row.count;
    ratingSum += row.ratingSum;
  });

  const averageRating = totalReviews ? Number((ratingSum / totalReviews).toFixed(2)) : 0;

  return { averageRating, totalReviews, reviewCount: totalReviews, ratingBreakdown };
};

const syncProductSummary = async (productId) => {
  const summary = await calculateProductSummary(productId);
  await updateProductRatingSummary(productId, {
    averageRating: summary.averageRating,
    reviewCount: summary.totalReviews,
  });
  return summary;
};

const listProductReviews = async (productId, query) => {
  ensureObjectId(productId, "Invalid product id");
  const skip = (query.page - 1) * query.limit;
  const sort = { [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 };

  const [reviews, total, summary] = await Promise.all([
    Review.find({ productId, status: "visible" }).sort(sort).skip(skip).limit(query.limit).lean(),
    Review.countDocuments({ productId, status: "visible" }),
    calculateProductSummary(productId),
  ]);

  return {
    reviews,
    summary: {
      averageRating: summary.averageRating,
      totalReviews: summary.totalReviews,
      ratingBreakdown: summary.ratingBreakdown,
    },
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
};

const listAdminReviews = async (query) => {
  const filter = {};

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.productId) {
    filter.productId = query.productId;
  }

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { comment: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
};

const createReview = async (userId, payload) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(payload.productId, "Invalid product id");
  ensureObjectId(payload.orderId, "Invalid order id");

  const eligibility = await checkReviewEligibility({
    userId,
    productId: payload.productId,
    orderId: payload.orderId,
  });

  if (!eligibility.eligible) {
    throw createError(
      eligibility.reason ||
        eligibility.message ||
        "You are not eligible to review this product",
      403,
    );
  }

  const existed = await Review.exists({
    userId,
    productId: payload.productId,
    orderId: payload.orderId,
  });

  if (existed) {
    throw createError("This product in this order has already been reviewed", 409);
  }

  const userSnapshot = await getUserSnapshot(userId);

  try {
    const review = await Review.create({
      productId: payload.productId,
      orderId: payload.orderId,
      userId,
      fullName: userSnapshot.fullName,
      avatarUrl: userSnapshot.avatarUrl,
      rating: payload.rating,
      comment: payload.comment,
      images: payload.images || [],
      isVerifiedPurchase: true,
      status: "visible",
    });

    const summary = await syncProductSummary(payload.productId);
    return { review: review.toObject(), summary };
  } catch (error) {
    if (error.code === 11000) {
      throw createError("This product in this order has already been reviewed", 409);
    }
    throw error;
  }
};

const updateReview = async (reviewId, userId, payload) => {
  ensureObjectId(reviewId, "Invalid review id");
  const review = await Review.findById(reviewId);
  if (!review) throw createError("Review not found", 404);

  if (review.userId.toString() !== userId) {
    throw createError("You can only edit your own review", 403);
  }

  if (payload.rating !== undefined) review.rating = payload.rating;
  if (payload.comment !== undefined) review.comment = payload.comment;
  if (payload.images !== undefined) review.images = payload.images;

  await review.save();
  const summary = await syncProductSummary(review.productId.toString());
  return { review: review.toObject(), summary };
};

const deleteReview = async (reviewId, auth) => {
  ensureObjectId(reviewId, "Invalid review id");
  const review = await Review.findById(reviewId);
  if (!review) throw createError("Review not found", 404);

  const isOwner = review.userId.toString() === auth.sub;
  const isAdmin = auth.role === "admin";
  if (!isOwner && !isAdmin) {
    throw createError("You can only delete your own review", 403);
  }

  const productId = review.productId.toString();
  await review.deleteOne();
  const summary = await syncProductSummary(productId);
  return { summary };
};

const hideReview = async (reviewId, adminId, reason) => {
  ensureObjectId(reviewId, "Invalid review id");
  const review = await Review.findById(reviewId);
  if (!review) throw createError("Review not found", 404);

  review.status = "hidden";
  review.hiddenReason = reason;
  review.hiddenAt = new Date();
  review.hiddenBy = adminId;
  await review.save();

  const summary = await syncProductSummary(review.productId.toString());
  return { review: review.toObject(), summary };
};

const showReview = async (reviewId) => {
  ensureObjectId(reviewId, "Invalid review id");
  const review = await Review.findById(reviewId);
  if (!review) throw createError("Review not found", 404);

  review.status = "visible";
  review.hiddenReason = "";
  review.hiddenAt = null;
  review.hiddenBy = null;
  await review.save();

  const summary = await syncProductSummary(review.productId.toString());
  return { review: review.toObject(), summary };
};

module.exports = {
  listProductReviews,
  listAdminReviews,
  createReview,
  updateReview,
  deleteReview,
  hideReview,
  showReview,
};
