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

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Mã xác thực phải gồm 6 chữ số",
    }),
  newPassword: Joi.string().min(6).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Mật khẩu xác nhận không khớp",
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  requestReactivationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
