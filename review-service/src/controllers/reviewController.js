const reviewService = require("../services/reviewService");
const {
  productIdParamSchema,
  idParamSchema,
  listReviewsQuerySchema,
  adminListReviewsQuerySchema,
  createReviewSchema,
  updateReviewSchema,
  hideReviewSchema,
} = require("../validators/reviewValidator");

const listProductReviews = async (req, res, next) => {
  try {
    const { productId } = await productIdParamSchema.validateAsync(req.params);
    const query = await listReviewsQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await reviewService.listProductReviews(productId, query);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

const listAdminReviews = async (req, res, next) => {
  try {
    const query = await adminListReviewsQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await reviewService.listAdminReviews(query);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const payload = await createReviewSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await reviewService.createReview(req.auth.sub, payload);
    return res.status(201).json({ success: true, message: "Review created", ...data });
  } catch (error) {
    return next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await updateReviewSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await reviewService.updateReview(id, req.auth.sub, payload);
    return res.status(200).json({ success: true, message: "Review updated", ...data });
  } catch (error) {
    return next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const data = await reviewService.deleteReview(id, req.auth);
    return res.status(200).json({ success: true, message: "Review deleted", ...data });
  } catch (error) {
    return next(error);
  }
};

const hideReview = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const payload = await hideReviewSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    const data = await reviewService.hideReview(id, req.auth.sub, payload.reason);
    return res.status(200).json({ success: true, message: "Review hidden", ...data });
  } catch (error) {
    return next(error);
  }
};

const showReview = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params);
    const data = await reviewService.showReview(id);
    return res.status(200).json({ success: true, message: "Review visible", ...data });
  } catch (error) {
    return next(error);
  }
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
