const { getKafka } = require("../config/kafkaClient");
const { pendingRequests } = require("./productKafkaProducer");
const { ensureTopics } = require("../events/kafkaAdmin");

/**
 * Kafka Consumer for ai-service.
 *
 * Consumer Group : ai-service-product-group
 *
 * Subscribed Topics:
 *   - product.search.response   â†’ resolves pending search requests
 *   - product.inventory.response â†’ resolves pending inventory checks
 *
 * Uses the Request-Reply pattern (Correlation ID) shared with productKafkaProducer.
 * Non-fatal: if broker is unreachable the consumer logs a warning and the
 * service continues using HTTP fallback in productClient.js.
 */

const CONSUMER_GROUP_ID = "ai-service-product-group";

const TOPICS = ["product.search.response", "product.inventory.response"];

let consumer = null;
let isConnected = false;

// ───────────────────────────────────────────────────
// Message handler — resolves the matching pending promise by correlationId
// ───────────────────────────────────────────────────
function handleMessage(topic, message) {
  let payload;
  try {
    payload = JSON.parse(message.value.toString());
  } catch (err) {
    console.warn("[KafkaConsumer] Failed to parse message:", err.message);
    return;
  }

  const { correlationId, ...data } = payload;

  if (!correlationId) {
    console.warn("[KafkaConsumer] Message missing correlationId, ignoring");
    return;
  }

  const pending = pendingRequests.get(correlationId);
  if (!pending) {
    // Already timed out or duplicate — safe to ignore
    return;
  }

  clearTimeout(pending.timer);
  pendingRequests.delete(correlationId);

  console.log(
    `[KafkaConsumer] 📥 Resolved ${topic} (correlationId: ${correlationId})`,
  );
  pending.resolve(data);
}

// ───────────────────────────────────────────────────
// Start consumer ── connects to broker and subscribes to response topics
// ───────────────────────────────────────────────────
async function startConsumer() {
  if (process.env.KAFKA_ENABLED === "false") {
    console.warn(
      "[KafkaConsumer] Disabled by KAFKA_ENABLED=false; HTTP fallback remains active.",
    );
    return null;
  }

  try {
    console.log("[ai-service] Ensuring Kafka topics...");
    const topicResult = await ensureTopics(TOPICS, {
      retries: 5,
      retryDelayMs: 3000,
    });
    if (!topicResult.ready) {
      console.warn(
        `[ai-service] Kafka unavailable, product reply topics not ready: ${topicResult.reason}`,
      );
      setTimeout(() => {
        startConsumer().catch((retryError) => {
          console.warn(
            "[ai-service] Kafka product reply consumer retry failed:",
            retryError.message,
          );
        });
      }, 5000).unref?.();
      return null;
    }
    console.log("[ai-service] Kafka topics ready");
    console.log("[ai-service] Starting Kafka consumer...");

    consumer = getKafka().consumer({ groupId: CONSUMER_GROUP_ID });

    await consumer.connect();
    isConnected = true;
    console.log(`[KafkaConsumer] ✅ Connected (group: ${CONSUMER_GROUP_ID})`);

    // Subscribe to all response topics
    for (const topic of TOPICS) {
      await consumer.subscribe({ topic, fromBeginning: false });
      console.log(`[KafkaConsumer] 📡 Subscribed to: ${topic}`);
    }

    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        handleMessage(topic, message);
      },
    });

    console.log("[KafkaConsumer] 🚀 Consumer running and ready");
  } catch (err) {
    isConnected = false;
    console.warn(
      `[KafkaConsumer] ⚠️ Could not connect to Kafka broker — running without Kafka.\n` +
        `  Reason: ${err.message}\n` +
        `  → productClient.js will use HTTP fallback automatically.`,
    );
    setTimeout(() => {
      startConsumer().catch((retryError) => {
        console.warn(
          "[ai-service] Kafka product reply consumer retry failed:",
          retryError.message,
        );
      });
    }, 5000).unref?.();
  }
}

async function stopConsumer() {
  if (isConnected && consumer) {
    await consumer.disconnect();
    isConnected = false;
    console.log("[KafkaConsumer] Disconnected");
  }
}

module.exports = {
  startConsumer,
  stopConsumer,
  isConnected: () => isConnected,
};
