const { allowedRecipient } = require("../config/env");
const { sendEmail } = require("../utils/emailSender");

const sendReactivationRequestEmail = async ({
  userId,
  fullName,
  email,
  inactiveReason,
}) => {
  const subject = "User Reactivation Request";
  const text = [
    `User ${fullName} (${email})`,
    "requested account reactivation.",
    "",
    "Reason:",
    `Account is inactive: ${inactiveReason}`,
    "",
    `User ID: ${userId}`,
  ].join("\n");

  await sendEmail({
    to: allowedRecipient,
    subject,
    text,
  });

  return {
    message: "Reactivation request email sent",
    to: allowedRecipient,
  };
};

module.exports = {
  sendReactivationRequestEmail,
};
