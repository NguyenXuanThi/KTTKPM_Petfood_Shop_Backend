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

module.exports = {
  reactivationRequestSchema,
};
