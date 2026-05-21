const axios = require("axios");
const config = require("../config/env");

class ProductClient {
  constructor() {
    this.baseURL = config.PRODUCT_SERVICE_URL;
  }

  async searchProducts(query, limit = 3) {
    try {
      console.log("Searching with query:", query, "limit:", limit);

      // Try search endpoint first with query
      let response = await axios.get(`${this.baseURL}/api/products`, {
        params: { search: query, limit: 20 }, // Get more to filter better
      });

      console.log("API Response:", response.data);

      // Handle different response formats
      let products = [];
      if (response.data.items) {
        products = response.data.items;
      } else if (response.data.data) {
        products = response.data.data;
      } else if (Array.isArray(response.data)) {
        products = response.data;
      }

      // Smart filter products by keywords
      if (products.length > 0 && query) {
        const keywords = query
          .toLowerCase()
          .split(" ")
          .filter((k) => k.length > 1);
        console.log("Filtering with keywords:", keywords);

        // Score each product
        const scoredProducts = products.map((product) => {
          const productText =
            `${product.name} ${product.description || ""}`.toLowerCase();
          let score = 0;

          // Exact keyword match in name (highest priority)
          keywords.forEach((keyword) => {
            if (product.name.toLowerCase().includes(keyword)) {
              score += 10;
            }
            if (
              product.description &&
              product.description.toLowerCase().includes(keyword)
            ) {
              score += 5;
            }
          });

          return { product, score };
        });

        // Filter products with score > 0 and sort by score
        products = scoredProducts
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.product);

        console.log("Filtered products:", products.length);
      }

      // If no results after filtering, try without search param
      if (products.length === 0) {
        console.log("No filtered results, getting default products");
        response = await axios.get(`${this.baseURL}/api/products`, {
          params: { limit: limit },
        });

        if (response.data.items) {
          products = response.data.items;
        } else if (response.data.data) {
          products = response.data.data;
        } else if (Array.isArray(response.data)) {
          products = response.data;
        }
      }

      return { success: true, data: products.slice(0, limit) };
    } catch (error) {
      console.error("Error searching products:", error.message);
      // Fallback: try to get any products
      try {
        const fallback = await axios.get(`${this.baseURL}/api/products`, {
          params: { limit: limit },
        });

        let products = [];
        if (fallback.data.items) {
          products = fallback.data.items;
        } else if (fallback.data.data) {
          products = fallback.data.data;
        } else if (Array.isArray(fallback.data)) {
          products = fallback.data;
        }

        return { success: true, data: products.slice(0, limit) };
      } catch (e) {
        return { success: false, data: [] };
      }
    }
  }

  async getProductById(productId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/products/${productId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error getting product:", error.message);
      return { success: false, data: null };
    }
  }

  async getAllProducts(filters = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/api/products`, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting products:", error.message);
      return { success: false, data: [] };
    }
  }

  async getProductsByCategory(categoryId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/products`, {
        params: { category: categoryId },
      });
      return response.data;
    } catch (error) {
      console.error("Error getting products by category:", error.message);
      return { success: false, data: [] };
    }
  }

  async checkStock(productId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/products/${productId}/stock`,
      );
      return response.data;
    } catch (error) {
      console.error("Error checking stock:", error.message);
      return { success: false, inStock: false };
    }
  }
}

module.exports = new ProductClient();
