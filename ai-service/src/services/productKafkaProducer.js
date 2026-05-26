const { v4: uuidv4 } = require('uuid');
const { getKafka } = require('../config/kafkaClient');

/**
 * Shared pending-request registry.
 * Key   : correlationId (string)
 * Value : { resolve, reject, timer }
 *
 * This Map is imported by productKafkaConsumer.js to resolve in-flight requests.
 */
const pendingRequests = new Map();

const REPLY_TIMEOUT_MS = 3000; // wait up to 3 s for a Kafka reply

let producer = null;
let producerReady = false;

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getProducer() {
  if (producerReady) return producer;
  producer = getKafka().producer();
  await producer.connect();
  producerReady = true;
  console.log('[KafkaProducer] ✅ Connected');
  return producer;
}

/**
 * Publish a request message and return a Promise that resolves when the
 * matching response arrives in productKafkaConsumer.js.
 *
 * @param {string} topic   - Request topic (e.g. 'product.search.request')
 * @param {object} payload - Message body (correlationId will be injected)
 * @returns {Promise<object>} Resolved with the response payload
 */
async function publishAndWait(topic, payload) {
  const correlationId = uuidv4();
  const p = getProducer();

  // Register the pending promise BEFORE publishing (avoid race condition)
  const responsePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(correlationId);
      reject(new Error(`Kafka reply timeout for ${topic} (correlationId: ${correlationId})`));
    }, REPLY_TIMEOUT_MS);

    pendingRequests.set(correlationId, { resolve, reject, timer });
  });

  try {
    const prod = await p;
    await prod.send({
      topic,
      messages: [
        {
          key: correlationId,
          value: JSON.stringify({ ...payload, correlationId }),
        },
      ],
    });
    console.log(`[KafkaProducer] 📤 Published to ${topic} (correlationId: ${correlationId})`);
  } catch (err) {
    // Cancel the pending promise if publish fails
    const entry = pendingRequests.get(correlationId);
    if (entry) {
      clearTimeout(entry.timer);
      pendingRequests.delete(correlationId);
    }
    throw err;
  }

  return responsePromise;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Request product search via Kafka.
 * Topic: product.search.request
 * Expected response on: product.search.response
 */
async function requestProductSearch(keywords, limit = 3) {
  return publishAndWait('product.search.request', { keywords, limit });
}

/**
 * Request inventory check via Kafka.
 * Topic: product.inventory.request
 * Expected response on: product.inventory.response
 */
async function requestInventoryCheck(productId) {
  return publishAndWait('product.inventory.request', { productId });
}

async function disconnectProducer() {
  if (producerReady && producer) {
    await producer.disconnect();
    producerReady = false;
    console.log('[KafkaProducer] Disconnected');
  }
}

module.exports = {
  pendingRequests,
  requestProductSearch,
  requestInventoryCheck,
  disconnectProducer,
};
