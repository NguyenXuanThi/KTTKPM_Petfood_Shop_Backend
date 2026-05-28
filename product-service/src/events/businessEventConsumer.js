const ProcessedEvent = require("../models/ProcessedEvent");
const Product = require("../models/Product");
const TOPICS = require("./topics");
const { startConsumer } = require("./kafkaConsumer");
const { safeRedis } = require("../config/redis");

let consumer;

const processReviewCreated = async (event) => {
  const exists = await ProcessedEvent.exists({ eventId: event.eventId });
  if (exists) {
    console.log(`[product-service] Event already processed eventId=${event.eventId}, skipping`);
    return;
  }

  const { productId, summary } = event.data || {};
  if (!productId || !summary) return;
  console.log(`[product-service] Consumed review.created productId=${productId}`);

  await Product.findByIdAndUpdate(productId, {
    averageRating: Number(summary.averageRating || 0),
    reviewCount: Number(summary.reviewCount || 0),
  });
  console.log(
    `[product-service] Updated rating summary productId=${productId} averageRating=${Number(summary.averageRating || 0)} reviewCount=${Number(summary.reviewCount || 0)}`,
  );

  await safeRedis((client) => client.del(`cache:products:detail:${productId}`));
  await ProcessedEvent.create({
    eventId: event.eventId,
    eventType: event.eventType,
  });
};

const startBusinessEventConsumer = async () => {
  consumer = await startConsumer({
    groupId: "product-service-business-events",
    topics: [TOPICS.REVIEW_CREATED],
    eachMessage: async ({ event }) => {
      if (event.eventType === TOPICS.REVIEW_CREATED) {
        await processReviewCreated(event);
      }
    },
  });
  return consumer;
};

const stopBusinessEventConsumer = async () => {
  if (consumer) await consumer.disconnect().catch(() => null);
};

module.exports = {
  startBusinessEventConsumer,
  stopBusinessEventConsumer,
};
