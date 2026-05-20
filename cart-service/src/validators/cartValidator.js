const Joi = require("joi");

const objectIdPattern = /^[a-f\d]{24}$/i;

const addItemSchema = Joi.object({
  productId: Joi.string().trim().pattern(objectIdPattern).required(),
  quantity: Joi.number().integer().min(1).default(1),
});

const updateItemQuantitySchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

const mergeCartSchema = Joi.object({
  guestToken: Joi.string().trim().min(10).max(200).required(),
});

const checkoutItemsSchema = Joi.object({
  userId: Joi.string().trim().pattern(objectIdPattern).required(),
  productIds: Joi.array()
    .items(Joi.string().trim().pattern(objectIdPattern))
    .min(1)
    .unique()
    .required(),
});

const restoreCheckoutItemsSchema = Joi.object({
  userId: Joi.string().trim().pattern(objectIdPattern).required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().pattern(objectIdPattern).required(),
        quantity: Joi.number().integer().min(1).required(),
        priceAtAdd: Joi.when("price", {
          is: Joi.exist(),
          then: Joi.number().min(0),
          otherwise: Joi.number().min(0).required(),
        }),
        price: Joi.number().min(0),
        productName: Joi.when("name", {
          is: Joi.exist(),
          then: Joi.string().trim().max(300),
          otherwise: Joi.string().trim().max(300).required(),
        }),
        name: Joi.string().trim().max(300),
        imageUrl: Joi.string().trim().allow("").default(""),
        lastValidatedAt: Joi.date().allow(null).optional(),
        flags: Joi.object({
          priceChanged: Joi.boolean().default(false),
          outOfStock: Joi.boolean().default(false),
          inactiveProduct: Joi.boolean().default(false),
        }).default(),
      }),
    )
    .min(1)
    .required(),
  sourceOrderId: Joi.string().trim().pattern(objectIdPattern).optional(),
});

module.exports = {
  addItemSchema,
  updateItemQuantitySchema,
  mergeCartSchema,
  checkoutItemsSchema,
  restoreCheckoutItemsSchema,
};
