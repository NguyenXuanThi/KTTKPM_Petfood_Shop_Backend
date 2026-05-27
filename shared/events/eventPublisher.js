/**
 * Kafka-friendly event publisher placeholder.
 *
 * Redis is used for cache, TTL, rate limits and short-lived coordination only.
 * Business events will be published through Kafka later without coupling Redis
 * cache helpers to event delivery.
 */
const publishEvent = async (eventName, payload = {}) => {
  console.log(`[eventPublisher:no-op] ${eventName}`, payload);
  return { published: false, transport: "noop" };
};

module.exports = {
  publishEvent,
};
