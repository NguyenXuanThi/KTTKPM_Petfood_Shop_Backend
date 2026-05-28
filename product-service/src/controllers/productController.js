const productService = require("../services/productService");
const TOPICS = require("../events/topics");
const { publishEvent } = require("../events/kafkaProducer");
const {
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  ratingSummarySchema,
} = require("../validators/productValidator");

const getRequestIdentity = (req) => ({
  userId: req.auth?.sub || req.headers["x-auth-sub"] || null,
  sessionId: req.headers["x-session-id"] || null,
});

const publishProductBehavior = async (topic, data, logContext) => {
  try {
    const result = await publishEvent(topic, { eventType: topic, data });
    if (result.published) {
      console.log(
        `[product-service] Published ${topic} ${logContext} userId=${data.userId || "guest"} sessionId=${data.sessionId || "n/a"}`,
      );
    } else {
      console.warn(`[product-service] Kafka unavailable, skipped ${topic} publish`);
    }
  } catch (error) {
    console.warn(`[product-service] Failed ${topic} publish: ${error.message}`);
  }
};

const createProduct = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Product image is required");
      error.statusCode = 400;
      throw error;
    }

    const payload = await createProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const product = await productService.createProduct(payload, req.file);

    return res.status(201).json({
      message: "Create product successful",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const query = await listProductSchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await productService.listProducts(query);

    const keyword = (query.keyword || "").trim();
    const shouldSkipBehaviorEvent = req.headers["x-skip-behavior-event"] === "true";
    if (keyword && !shouldSkipBehaviorEvent) {
      const { userId, sessionId } = getRequestIdentity(req);
      publishProductBehavior(
        TOPICS.PRODUCT_SEARCHED,
        {
          userId,
          sessionId,
          keyword,
          filters: {
            categoryId: query.categoryId || null,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          },
          timestamp: new Date().toISOString(),
        },
        `keyword="${keyword}"`,
      );
    }

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getProductDetail = async (req, res, next) => {
  try {
    const product = await productService.getProductDetail(req.params.id);

    const { userId, sessionId } = getRequestIdentity(req);
    if (req.headers["x-skip-behavior-event"] !== "true") {
      publishProductBehavior(
        TOPICS.PRODUCT_VIEWED,
        {
          userId,
          sessionId,
          productId: product._id?.toString() || req.params.id,
          categoryId: product.categoryId?.toString() || null,
          productName: product.name,
          timestamp: new Date().toISOString(),
        },
        `productId=${product._id || req.params.id}`,
      );
    }

    return res.status(200).json({ product });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const hasBodyData = Object.keys(req.body || {}).length > 0;

    if (!hasBodyData && !req.file) {
      const error = new Error("No data to update");
      error.statusCode = 400;
      throw error;
    }

    const payload = hasBodyData
      ? await updateProductSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        })
      : {};

    const product = await productService.updateProduct(req.params.id, payload, req.file);

    return res.status(200).json({
      message: "Update product successful",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);

    return res.status(200).json({
      message: "Delete product successful",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const updateRatingSummaryInternal = async (req, res, next) => {
  try {
    const payload = await ratingSummarySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const product = await productService.updateRatingSummary(req.params.id, payload);

    return res.status(200).json({
      success: true,
      message: "Rating summary updated",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

const getProductsBatchInternal = async (req, res, next) => {
  try {
    const productIds = Array.isArray(req.body.productIds) ? req.body.productIds : [];
    const products = await productService.getProductsByIds(productIds);
    return res.status(200).json({ success: true, products });
  } catch (error) {
    return next(error);
  }
};

const getBestSellersInternal = async (req, res, next) => {
  try {
    const products = await productService.getBestSellers(req.query.limit);
    return res.status(200).json({ success: true, products });
  } catch (error) {
    return next(error);
  }
};

const getRelatedProductsInternal = async (req, res, next) => {
  try {
    const products = await productService.getRelatedProducts({
      productId: req.query.productId,
      categoryId: req.query.categoryId,
      limit: req.query.limit,
    });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProduct,
  listProducts,
  getProductDetail,
  updateProduct,
  deleteProduct,
  updateRatingSummaryInternal,
  getProductsBatchInternal,
  getBestSellersInternal,
  getRelatedProductsInternal,
};
