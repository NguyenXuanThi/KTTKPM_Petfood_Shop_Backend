const notificationService = require("../services/notificationService");
const {
  reactivationRequestSchema,
} = require("../validators/notificationValidator");

const sendReactivationRequest = async (req, res, next) => {
  try {
    const payload = await reactivationRequestSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result =
      await notificationService.sendReactivationRequestEmail(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  sendReactivationRequest,
};
