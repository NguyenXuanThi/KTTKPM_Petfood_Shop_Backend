const TOPICS = require("./topics");
const { startConsumer } = require("./kafkaConsumer");
const recommendationService = require("../services/recommendationService");

let consumer = null;

const startRecommendationConsumer = async () => {
  consumer = await startConsumer({
    groupId: "ai-service-recommendations",
    topics: [TOPICS.PRODUCT_VIEWED, TOPICS.PRODUCT_SEARCHED],
    eachMessage: async ({ event }) => {
      if (event.eventType === TOPICS.PRODUCT_VIEWED) {
        await recommendationService.handleProductViewed(event.data);
        return;
      }

      if (event.eventType === TOPICS.PRODUCT_SEARCHED) {
        await recommendationService.handleProductSearched(event.data);
      }
    },
  });

  return consumer;
};

const stopRecommendationConsumer = async () => {
  if (consumer) await consumer.disconnect().catch(() => null);
};

module.exports = {
  startRecommendationConsumer,
  stopRecommendationConsumer,
};
