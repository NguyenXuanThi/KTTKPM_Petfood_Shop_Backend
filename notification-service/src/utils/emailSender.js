const nodemailer = require("nodemailer");
const { emailUser, emailPass, allowedRecipient } = require("../config/env");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

const assertAllowedRecipient = (to) => {
  if (to !== allowedRecipient) {
    const error = new Error("Email recipient is not allowed");
    error.statusCode = 403;
    throw error;
  }
};

const sendEmail = async ({ to, subject, text }) => {
  assertAllowedRecipient(to);

  return transporter.sendMail({
    from: `"PetFood System" <${emailUser}>`,
    to,
    subject,
    text,
  });
};

module.exports = {
  sendEmail,
};
