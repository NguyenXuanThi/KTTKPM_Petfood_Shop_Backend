require("dotenv").config();
const mongoose = require("mongoose");
const createApp = require("./app");
const TOPICS = require("./events/topics");
const { ensureTopics } = require("./events/kafkaAdmin");

const PORT = process.env.APPOINTMENT_PORT || 3014;
const MONGO = process.env.APPOINTMENT_MONGODB_URI;

async function start() {
  if (!MONGO) {
    console.error("Missing APPOINTMENT_MONGODB_URI in env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO, {
      dbName: "petfood_appointment",
    });
    console.log("Connected to MongoDB (appointment-service)");
  } catch (err) {
    console.error("MongoDB connection error", err);
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`appointment-service is running on port ${PORT}`);
    console.log("[appointment-service] Ensuring Kafka topics...");
    ensureTopics([TOPICS.APPOINTMENT_CREATED])
      .then((result) => {
        if (result.ready) console.log("[appointment-service] Kafka topics ready");
        else console.warn(`[appointment-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
      })
      .catch((error) => {
        console.warn("[appointment-service] Kafka topic bootstrap failed:", error.message);
      });
  });
}

start();

