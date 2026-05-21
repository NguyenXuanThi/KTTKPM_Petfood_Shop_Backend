const productService = require("../services/productService");
const {
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  ratingSummarySchema,
} = require("../validators/productValidator");

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

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getProductDetail = async (req, res, next) => {
  try {
    const product = await productService.getProductDetail(req.params.id);

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

module.exports = {
  createProduct,
  listProducts,
  getProductDetail,
  updateProduct,
  deleteProduct,
  updateRatingSummaryInternal,
};
