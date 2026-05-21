const Joi = require("joi");

const sendMessageSchema = Joi.object({
  sessionId: Joi.string().optional(),
  message: Joi.string().required().min(1).max(2000),
  userId: Joi.string().optional(),
});

const createConversationSchema = Joi.object({
  userId: Joi.string().optional(),
});

const validateSendMessage = (req, res, next) => {
  const { error } = sendMessageSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: error.details[0].message,
    });
  }
  next();
};

const validateCreateConversation = (req, res, next) => {
  const { error } = createConversationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: error.details[0].message,
    });
  }
  next();
};

module.exports = {
  validateSendMessage,
  validateCreateConversation,
};
