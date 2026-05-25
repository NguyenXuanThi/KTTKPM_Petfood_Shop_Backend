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
    enforceAllowedRecipient: true,
  });

  return {
    message: "Reactivation request email sent",
    to: allowedRecipient,
  };
};

const formatDiscount = ({ type, discountValue }) => {
  if (type === "percentage") return `${discountValue}% off`;
  return `$${discountValue} off`;
};

const sendCouponAssignedEmail = async ({
  email,
  fullName,
  couponCode,
  discountValue,
  type,
  expiresAt,
}) => {
  const subject = "You received a new coupon!";
  const discountText = formatDiscount({ type, discountValue });
  const expiresAtText = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    `Hello ${fullName},`,
    "",
    `You have received a new coupon: ${couponCode}`,
    `Discount: ${discountText}`,
    `Expires at: ${expiresAtText}`,
    "",
    "Use it soon and enjoy your shopping at PetFood!",
  ].join("\n");

  await sendEmail({
    to: email,
    subject,
    text,
    enforceAllowedRecipient: false,
  });

  return {
    message: "Coupon assigned email sent",
    to: email,
  };
};

const sendPasswordResetOtpEmail = async ({ email, otp }) => {
  const subject = "Mã xác thực đặt lại mật khẩu";
  const text = [
    "Xin chào,",
    "",
    "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản PetFood.",
    "",
    `Mã xác thực của bạn là: ${otp}`,
    "",
    "Mã này có hiệu lực trong 180 giây.",
    "Vui lòng không chia sẻ mã này với bất kỳ ai.",
    "",
    "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.",
  ].join("\n");

  await sendEmail({
    to: email,
    subject,
    text,
    enforceAllowedRecipient: false,
  });

  return {
    message: "Password reset OTP email sent",
    to: email,
  };
};

module.exports = {
  sendReactivationRequestEmail,
  sendCouponAssignedEmail,
  sendPasswordResetOtpEmail,
};
