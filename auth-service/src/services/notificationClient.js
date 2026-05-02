const axios = require("axios");
const {
  notificationServiceUrl,
  notificationServiceTimeoutMs,
} = require("../config/env");

const callNotificationService = async (config) => {
  try {
    const response = await axios({
      timeout: notificationServiceTimeoutMs,
      ...config,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const mappedError = new Error(
        error.response.data?.message || "Notification service request failed",
      );
      mappedError.statusCode = error.response.status;
      throw mappedError;
    }

    const upstreamError = new Error("notification-service is unavailable");
    upstreamError.statusCode = 502;
    throw upstreamError;
  }
};

const sendReactivationRequest = async ({
  userId,
  fullName,
  email,
  inactiveReason,
}) =>
  callNotificationService({
    method: "post",
    url: `${notificationServiceUrl}/notifications/email/reactivation-request`,
    data: {
      userId,
      fullName,
      email,
      inactiveReason,
    },
  });

module.exports = {
  sendReactivationRequest,
};
