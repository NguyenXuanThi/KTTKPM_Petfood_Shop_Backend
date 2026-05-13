const Joi = require("joi");

const objectId = Joi.string().trim().pattern(/^[a-f\d]{24}$/i);

const uploadProofSchema = Joi.object({
  orderId: objectId.required(),
});

const idParamSchema = Joi.object({
  id: objectId.required(),
});

const rejectPaymentSchema = Joi.object({
  rejectedReason: Joi.string().trim().max(500).required(),
});

const pagingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  uploadProofSchema,
  idParamSchema,
  rejectPaymentSchema,
  pagingQuerySchema,
};
