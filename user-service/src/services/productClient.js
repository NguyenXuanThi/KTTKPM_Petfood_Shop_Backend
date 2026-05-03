const axios = require("axios");
const { productServiceUrl, productServiceTimeoutMs } = require("../config/env");

const getProductById = async (productId) => {
  try {
    const response = await axios.get(`${productServiceUrl}/api/products/${productId}`, {
      timeout: productServiceTimeoutMs,
    });

    if (!response.data || !response.data.product) {
      const error = new Error("Invalid response from product-service");
      error.statusCode = 502;
      throw error;
    }

    return response.data.product;
  } catch (error) {
    if (error.response?.status === 404) {
      const notFoundError = new Error("Product not found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    if (error.statusCode) {
      throw error;
    }

    const upstreamError = new Error("product-service is unavailable");
    upstreamError.statusCode = 502;
    throw upstreamError;
  }
};

module.exports = {
  getProductById,
};