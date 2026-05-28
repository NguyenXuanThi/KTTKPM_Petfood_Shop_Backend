const ProcessedEvent = require("../models/ProcessedEvent");
const TOPICS = require("./topics");
const { startConsumer } = require("./kafkaConsumer");
const rewardService = require("../services/rewardService");

let consumer;

const processOnce = async (event, handler) => {
  if (!event?.eventId) return;
  const exists = await ProcessedEvent.exists({ eventId: event.eventId });
  if (exists) {
    console.log(`[reward-service] Event already processed eventId=${event.eventId}, skipping`);
    return;
  }

  await handler(event.data || {});
  await ProcessedEvent.create({
    eventId: event.eventId,
    eventType: event.eventType,
  });
};

const grantFromPayment = async (data) => {
  if (!data.userId || !data.orderId) return;
  await rewardService.grantSpins({
    userId: data.userId,
    orderId: data.orderId,
    paidAmount: data.amount,
  });
};

const grantFromCompletedOrder = async (data) => {
  if (!data.userId || !data.orderId) return;
  await rewardService.grantSpins({
    userId: data.userId,
    orderId: data.orderId,
    paidAmount: data.totalAmount,
  });
};

const startBusinessEventConsumer = async () => {
  consumer = await startConsumer({
    groupId: "reward-service-business-events",
    topics: [TOPICS.PAYMENT_PAID, TOPICS.ORDER_COMPLETED],
    eachMessage: async ({ event }) => {
      if (event.eventType === TOPICS.PAYMENT_PAID) {
        console.log(
          `[reward-service] Consumed payment.paid eventId=${event.eventId} orderId=${event.data?.orderId} userId=${event.data?.userId} amount=${event.data?.amount}`,
        );
        await processOnce(event, grantFromPayment);
      }
      if (event.eventType === TOPICS.ORDER_COMPLETED) {
        console.log(
          `[reward-service] Consumed order.completed eventId=${event.eventId} orderId=${event.data?.orderId} userId=${event.data?.userId} amount=${event.data?.totalAmount}`,
        );
        await processOnce(event, grantFromCompletedOrder);
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
