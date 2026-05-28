const axios = require("axios");
const config = require("../config/env");

const client = axios.create({
  baseURL: config.PRODUCT_SERVICE_URL,
  timeout: 5000,
  headers: {
    "x-internal-key": config.PRODUCT_INTERNAL_KEY,
  },
});

const normalizeProducts = (data) => data?.products || data?.items || data?.data || [];

const getProductsBatch = async (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];
  const { data } = await client.post("/internal/products/batch", { productIds });
  return normalizeProducts(data);
};

const getBestSellers = async (limit = 8) => {
  const { data } = await client.get("/internal/products/best-sellers", {
    params: { limit },
  });
  return normalizeProducts(data);
};

const getRelatedProducts = async ({ productId, categoryId, limit = 12 }) => {
  const { data } = await client.get("/internal/products/related", {
    params: { productId, categoryId, limit },
  });
  return normalizeProducts(data);
};

const searchProducts = async ({ keyword, limit = 12 }) => {
  const { data } = await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products`, {
    params: {
      keyword,
      limit,
      page: 1,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    headers: {
      "x-skip-behavior-event": "true",
    },
    timeout: 5000,
  });
  return normalizeProducts(data);
};

module.exports = {
  getProductsBatch,
  getBestSellers,
  getRelatedProducts,
  searchProducts,
};
