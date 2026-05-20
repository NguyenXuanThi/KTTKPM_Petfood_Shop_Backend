const orderService = require("../services/orderService");

const FIVE_MINUTES_MS = 5 * 60 * 1000;

let running = false;
let intervalId = null;

const runOnce = async () => {
  if (running) return;
  running = true;

  try {
    const results = await orderService.expireOverdueBankingOrders();
    const expiredCount = results.filter((result) => result.success).length;

    if (expiredCount > 0) {
      console.log(`[order-service] expired ${expiredCount} overdue banking order(s)`);
    }
  } catch (error) {
    console.error("[order-service] banking payment timeout job failed:", error.message);
  } finally {
    running = false;
  }
};

const startBankingPaymentTimeoutJob = () => {
  if (intervalId) return;

  runOnce();
  intervalId = setInterval(runOnce, FIVE_MINUTES_MS);
};

module.exports = {
  startBankingPaymentTimeoutJob,
  runOnce,
};
