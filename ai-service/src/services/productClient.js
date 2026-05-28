const axios = require('axios');
const config = require('../config/env');
const { requestProductSearch, requestInventoryCheck } = require('./productKafkaProducer');
const { isConnected: kafkaIsConnected } = require('./productKafkaConsumer');

/**
 * productClient — unified data-access layer for product & inventory info.
 *
 * Strategy:
 *   1. If Kafka consumer is connected → use Request-Reply via Kafka topics
 *      (product.search.request / product.inventory.request)
 *   2. If Kafka is unavailable (no broker) → HTTP fallback to product-service REST API
 *
 * This ensures ai-service works in all environments regardless of Kafka availability.
 */

// ──────────────────────────────────────────────────────────────────────────────
// HTTP helpers (fallback)
// ──────────────────────────────────────────────────────────────────────────────

async function searchProductsHTTP(keyword, limit = 3) {
  // Try exact phrase first
  const { data } = await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products`, {
    params: { keyword, limit, page: 1 },
    timeout: 5000,
  });
  let products = data.items || data.products || data.data || [];

  // Fallback: if multi-word phrase returns nothing, try each word individually
  if (products.length === 0 && keyword.includes(' ')) {
    const words = keyword
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1);

    const seen = new Map();
    for (const word of words) {
      if (seen.size >= limit) break;
      try {
        const { data: wd } = await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products`, {
          params: { keyword: word, limit, page: 1 },
          timeout: 5000,
        });
        const wordProducts = wd.items || wd.products || wd.data || [];
        wordProducts.forEach((p) => seen.set(p._id.toString(), p));
      } catch (_) { /* ignore per-word errors */ }
    }
    products = Array.from(seen.values()).slice(0, limit);
  }

  return products;
}

async function checkInventoryHTTP(productId) {
  const { data } = await axios.get(`${config.PRODUCT_SERVICE_URL}/api/products/${productId}`, {
    timeout: 5000,
  });
  // product-service returns { data: { ...product } } or { ...product }
  const product = data.data || data;
  return { stock: product.stock ?? 0, name: product.name };
}

// ──────────────────────────────────────────────────────────────────────────────
// Kafka helpers
// ──────────────────────────────────────────────────────────────────────────────

async function searchProductsKafka(keywords, limit) {
  // requestProductSearch returns the response payload from product-service
  const response = await requestProductSearch(keywords, limit);
  // product-service is expected to respond with { products: [...] }
  return response.products || response.items || response.data || [];
}

async function checkInventoryKafka(productId) {
  const response = await requestInventoryCheck(productId);
  // Expected response: { stock, name }
  return { stock: response.stock ?? 0, name: response.name };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

const productClient = {
  /**
   * Search products by keyword.
   * Tries Kafka first, falls back to HTTP if Kafka unavailable or times out.
   */
  async searchProducts(keyword, limit = 3) {
    // ── Kafka path ──────────────────────────────────────────────────────────
    if (kafkaIsConnected()) {
      try {
        console.log(`[productClient] 🔀 Kafka search: "${keyword}" limit=${limit}`);
        const products = await searchProductsKafka(keyword, limit);
        return { success: true, data: products };
      } catch (err) {
        console.warn(`[productClient] Kafka search failed (${err.message}), falling back to HTTP`);
      }
    }

    // ── HTTP fallback ───────────────────────────────────────────────────────
    try {
      console.log(`[productClient] 🌐 HTTP search: "${keyword}" limit=${limit}`);
      const products = await searchProductsHTTP(keyword, limit);
      return { success: true, data: products };
    } catch (err) {
      console.error('[productClient] HTTP searchProducts error:', err.message);
      return { success: false, data: [] };
    }
  },

  /**
   * Check inventory/stock for a specific product by ID.
   * Tries Kafka first, falls back to HTTP.
   */
  async checkInventory(productId) {
    // ── Kafka path ──────────────────────────────────────────────────────────
    if (kafkaIsConnected()) {
      try {
        console.log(`[productClient] 🔀 Kafka inventory: productId=${productId}`);
        const data = await checkInventoryKafka(productId);
        return { success: true, data };
      } catch (err) {
        console.warn(`[productClient] Kafka inventory failed (${err.message}), falling back to HTTP`);
      }
    }

    // ── HTTP fallback ───────────────────────────────────────────────────────
    try {
      console.log(`[productClient] 🌐 HTTP inventory: productId=${productId}`);
      const data = await checkInventoryHTTP(productId);
      return { success: true, data };
    } catch (err) {
      console.error('[productClient] HTTP checkInventory error:', err.message);
      return { success: false, data: { stock: 0 } };
    }
  },
};

module.exports = productClient;
