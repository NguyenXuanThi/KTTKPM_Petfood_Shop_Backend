const TOPICS = require("./topics");
const { startConsumer } = require("./kafkaConsumer");
const { sendEmail } = require("../utils/emailSender");
const { allowedRecipient } = require("../config/env");

let consumer;

const processOnce = async (event, handler) => {
  if (!event?.eventId) return;
  await handler(event.data || {});
};

const notifyAdmin = async (subject, lines) => {
  await sendEmail({
    to: allowedRecipient,
    subject,
    text: lines.join("\n"),
    enforceAllowedRecipient: true,
  });
};

const startBusinessEventConsumer = async () => {
  consumer = await startConsumer({
    groupId: "notification-service-business-events",
    topics: [
      TOPICS.PAYMENT_PAID,
      TOPICS.ORDER_COMPLETED,
      TOPICS.COUPON_ASSIGNED,
      TOPICS.REVIEW_CREATED,
      TOPICS.REWARD_GRANTED,
      TOPICS.APPOINTMENT_CREATED,
    ],
    eachMessage: async ({ event }) => {
      await processOnce(event, async (data) => {
        if (event.eventType === TOPICS.PAYMENT_PAID) {
          console.log(
            `[notification-service] Consumed payment.paid eventId=${event.eventId} userId=${data.userId}`,
          );
          console.log(`[notification-service] Sending payment success email to userId=${data.userId}`);
          await notifyAdmin("Payment paid", [
            `Payment ${data.paymentId} paid.`,
            `Order: ${data.orderId}`,
            `Amount: ${data.amount}`,
          ]);
          console.log(`[notification-service] Payment success email sent userId=${data.userId}`);
        }
        if (event.eventType === TOPICS.ORDER_COMPLETED) {
          console.log(
            `[notification-service] Consumed order.completed eventId=${event.eventId} userId=${data.userId} orderId=${data.orderId}`,
          );
          await notifyAdmin("Order completed", [
            `Order ${data.orderId} completed.`,
            `User: ${data.userId}`,
            `Total: ${data.totalAmount}`,
          ]);
          console.log(`[notification-service] Order completed email sent userId=${data.userId}`);
        }
        if (event.eventType === TOPICS.COUPON_ASSIGNED) {
          console.log(
            `[notification-service] Consumed coupon.assigned eventId=${event.eventId} userId=${data.userId} couponId=${data.couponId}`,
          );
          await notifyAdmin("Coupon assigned", [
            `Coupon ${data.couponId} assigned to user ${data.userId}.`,
            `Source: ${data.source}`,
          ]);
          console.log(`[notification-service] Coupon assigned email sent userId=${data.userId}`);
        }
        if (event.eventType === TOPICS.REVIEW_CREATED) {
          console.log(
            `[notification-service] Consumed review.created eventId=${event.eventId} productId=${data.productId} userId=${data.userId}`,
          );
          await notifyAdmin("Review created", [
            `Review ${data.reviewId} created.`,
            `Product: ${data.productId}`,
            `Rating: ${data.rating}`,
          ]);
          console.log(`[notification-service] Review notification email sent reviewId=${data.reviewId}`);
        }
        if (event.eventType === TOPICS.REWARD_GRANTED) {
          console.log(
            `[notification-service] Consumed reward.granted eventId=${event.eventId} userId=${data.userId} rewardType=${data.rewardType}`,
          );
          await notifyAdmin("Reward granted", [
            `Reward granted to user ${data.userId}.`,
            `Type: ${data.rewardType}`,
            `Value: ${data.rewardValue}`,
          ]);
          console.log(`[notification-service] Reward notification email sent userId=${data.userId}`);
        }
        if (event.eventType === TOPICS.APPOINTMENT_CREATED) {
          console.log(
            `[notification-service] Consumed appointment.created eventId=${event.eventId} appointmentId=${data.appointmentId}`,
          );
          await notifyAdmin("Appointment created", [
            `Appointment ${data.appointmentId} created.`,
            `Customer: ${data.customerName}`,
            `Time: ${data.appointmentTime}`,
          ]);
          console.log(`[notification-service] Appointment confirmation email sent appointmentId=${data.appointmentId}`);
        }
      });
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
