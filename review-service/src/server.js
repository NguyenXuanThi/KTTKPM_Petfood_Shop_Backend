const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const TOPICS = require("./events/topics");
const { ensureTopics } = require("./events/kafkaAdmin");

const bootstrapKafkaTopics = () => {
  console.log("[review-service] Ensuring Kafka topics...");
  ensureTopics([TOPICS.REVIEW_CREATED])
    .then((result) => {
      if (result.ready) console.log("[review-service] Kafka topics ready");
      else console.warn(`[review-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
    })
    .catch((error) => {
      console.warn("[review-service] Kafka topic bootstrap failed:", error.message);
    });
};

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);
    app.listen(port, () => {
      console.log(`review-service is running on port ${port}`);
      bootstrapKafkaTopics();
    });
  } catch (error) {
    console.error("Failed to start review-service", error);
    process.exit(1);
  }
};

startServer();
