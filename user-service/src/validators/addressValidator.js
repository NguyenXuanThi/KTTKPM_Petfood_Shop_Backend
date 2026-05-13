const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;
const phonePattern = /^[0-9+\-()\s]{8,20}$/;

const idParamSchema = Joi.object({
  id: Joi.string().trim().pattern(objectIdPattern).required(),
});

const addressBodySchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string().trim().pattern(phonePattern).required(),
  province: Joi.string().trim().min(1).max(120).required(),
  district: Joi.string().trim().min(1).max(120).required(),
  ward: Joi.string().trim().min(1).max(120).required(),
  detailAddress: Joi.string().trim().min(1).max(300).required(),
  label: Joi.string().trim().max(50).default("Home"),
});

const updateAddressBodySchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120),
  phone: Joi.string().trim().pattern(phonePattern),
  province: Joi.string().trim().min(1).max(120),
  district: Joi.string().trim().min(1).max(120),
  ward: Joi.string().trim().min(1).max(120),
  detailAddress: Joi.string().trim().min(1).max(300),
  label: Joi.string().trim().max(50),
}).min(1);

const internalAddressQuerySchema = Joi.object({
  userId: Joi.string().trim().pattern(objectIdPattern).required(),
});

module.exports = {
  idParamSchema,
  addressBodySchema,
  updateAddressBodySchema,
  internalAddressQuerySchema,
};
