const notificationService = require("../services/notificationService");
const {
  reactivationRequestSchema,
  couponAssignedSchema,
  passwordResetOtpSchema,
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

const sendCouponAssigned = async (req, res, next) => {
  try {
    const payload = await couponAssignedSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await notificationService.sendCouponAssignedEmail(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const sendPasswordResetOtp = async (req, res, next) => {
  try {
    const payload = await passwordResetOtpSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await notificationService.sendPasswordResetOtpEmail(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  sendReactivationRequest,
  sendCouponAssigned,
  sendPasswordResetOtp,
};
