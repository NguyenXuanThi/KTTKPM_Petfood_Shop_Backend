const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;

const createUserSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid("user", "admin", "support").default("user"),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  avatarUrl: Joi.string().trim().uri().allow(""),
}).min(1);

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).max(128).required(),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .invalid(Joi.ref("oldPassword"))
    .required(),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid("user", "admin", "support").required(),
});

const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const deactivateUserSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required(),
});

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  email: Joi.string().trim().allow(""),
  status: Joi.string().valid("active", "inactive").allow(""),
  isActive: Joi.boolean(),
  active: Joi.boolean(),
  inactive: Joi.boolean(),
});

const idParamSchema = Joi.object({
  id: Joi.string().trim().pattern(objectIdPattern).required(),
});

const emailParamSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
});

module.exports = {
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateRoleSchema,
  updateStatusSchema,
  deactivateUserSchema,
  listUsersQuerySchema,
  idParamSchema,
  emailParamSchema,
  searchQuerySchema,
};
