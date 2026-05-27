const app = require("./app");
const { port } = require("./config/env");
const { startBusinessEventConsumer } = require("./events/businessEventConsumer");

app.listen(port, () => {
  console.log(`notification-service is running on port ${port}`);
  startBusinessEventConsumer().catch((error) => {
    console.warn("[notification-service] Kafka consumer startup failed:", error.message);
  });
});
