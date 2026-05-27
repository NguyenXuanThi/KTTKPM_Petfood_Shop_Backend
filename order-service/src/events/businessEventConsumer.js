const ProcessedEvent = require("../models/ProcessedEvent");
const TOPICS = require("./topics");
const { startConsumer } = require("./kafkaConsumer");
const orderService = require("../services/orderService");

let consumer;

const processOnce = async (event, handler) => {
  if (!event?.eventId) return;
  const exists = await ProcessedEvent.exists({ eventId: event.eventId });
  if (exists) {
    console.log(`[order-service] Event already processed eventId=${event.eventId}, skipping`);
    return;
  }

  await handler(event.data || {});
  await ProcessedEvent.create({
    eventId: event.eventId,
    eventType: event.eventType,
  });
};

const startBusinessEventConsumer = async () => {
  consumer = await startConsumer({
    groupId: "order-service-business-events",
    topics: [TOPICS.PAYMENT_PAID],
    eachMessage: async ({ event }) => {
      if (event.eventType === TOPICS.PAYMENT_PAID) {
        console.log(
          `[order-service] Consumed payment.paid eventId=${event.eventId} orderId=${event.data?.orderId} userId=${event.data?.userId}`,
        );
        await processOnce(event, orderService.handlePaymentPaidEvent);
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
