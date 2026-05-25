const Joi = require("joi");

const reactivationRequestSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^[a-f\d]{24}$/i)
    .required(),
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  inactiveReason: Joi.string().trim().min(1).max(500).required(),
});

const couponAssignedSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  fullName: Joi.string().trim().min(2).max(100).required(),
  couponCode: Joi.string().trim().min(3).max(50).required(),
  discountValue: Joi.number().positive().required(),
  type: Joi.string().valid("percentage", "fixed").required(),
  expiresAt: Joi.date().iso().required(),
});

const passwordResetOtpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required(),
});

module.exports = {
  reactivationRequestSchema,
  couponAssignedSchema,
  passwordResetOtpSchema,
};
