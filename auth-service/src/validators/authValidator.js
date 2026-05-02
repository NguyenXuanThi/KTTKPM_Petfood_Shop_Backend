const Joi = require("joi");

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const requestReactivationSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^[a-f\d]{24}$/i)
    .required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  requestReactivationSchema,
};
