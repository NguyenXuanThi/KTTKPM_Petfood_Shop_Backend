const reviewService = require("../services/reviewService");
const {
  productIdParamSchema,
  reviewIdParamSchema,
  createReviewSchema,
  updateReviewSchema,
} = require("../validators/reviewValidator");

const listProductReviews = async (req, res, next) => {
  try {
    const { productId } = await productIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await reviewService.listProductReviews(productId, req.auth?.sub || null);

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const createOrUpdateReview = async (req, res, next) => {
  try {
    const { productId } = await productIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const payload = await createReviewSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const review = await reviewService.upsertReview(productId, req.auth.sub, payload);

    return res.status(200).json({
      message: "Review saved successfully",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = await reviewIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const payload = await updateReviewSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const review = await reviewService.updateReview(reviewId, req.auth.sub, payload);

    return res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = await reviewIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const review = await reviewService.deleteReview(reviewId, req.auth);

    return res.status(200).json({
      message: "Review deleted successfully",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

const hideReview = async (req, res, next) => {
  try {
    const { reviewId } = await reviewIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const review = await reviewService.setReviewVisibility(reviewId, "hidden");

    return res.status(200).json({
      message: "Review hidden successfully",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

const showReview = async (req, res, next) => {
  try {
    const { reviewId } = await reviewIdParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const review = await reviewService.setReviewVisibility(reviewId, "visible");

    return res.status(200).json({
      message: "Review shown successfully",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listProductReviews,
  createOrUpdateReview,
  updateReview,
  deleteReview,
  hideReview,
  showReview,
};