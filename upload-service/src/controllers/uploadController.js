const uploadService = require("../services/uploadService");
const {
  uploadSchema,
  deleteFileSchema,
  presignedUploadSchema,
} = require("../validators/uploadValidator");

const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("file is required");
      error.statusCode = 400;
      throw error;
    }

    const payload = await uploadSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await uploadService.uploadFile({
      file: req.file,
      type: payload.type,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

const uploadPaymentProof = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("file is required");
      error.statusCode = 400;
      throw error;
    }

    const result = await uploadService.uploadFile({
      file: req.file,
      type: "payment",
    });

    return res.status(201).json({
      url: result.url,
      publicId: result.publicId || result.key,
      provider: result.provider,
    });
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const payload = await deleteFileSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await uploadService.deleteFile(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const createPresignedUrl = async (req, res, next) => {
  try {
    const payload = await presignedUploadSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const result = await uploadService.createPresignedUploadUrl(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  upload,
  uploadPaymentProof,
  remove,
  createPresignedUrl,
};
