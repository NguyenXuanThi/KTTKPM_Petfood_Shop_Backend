const addressService = require("../services/addressService");
const {
  idParamSchema,
  addressBodySchema,
  updateAddressBodySchema,
  internalAddressQuerySchema,
} = require("../validators/addressValidator");

const listMyAddresses = async (req, res, next) => {
  try {
    const items = await addressService.listMyAddresses(req.auth.sub);
    return res.status(200).json({ success: true, items });
  } catch (error) {
    return next(error);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const payload = await addressBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const address = await addressService.createAddress(req.auth.sub, payload);

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      address,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const payload = await updateAddressBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const address = await addressService.updateAddress(req.auth.sub, id, payload);

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    return next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const address = await addressService.setDefaultAddress(req.auth.sub, id);

    return res.status(200).json({
      success: true,
      message: "Default address updated",
      address,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    await addressService.deleteAddress(req.auth.sub, id);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getAddressInternal = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const { userId } = await internalAddressQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await addressService.getAddressSnapshotInternal({
      userId,
      addressId: id,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMyAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getAddressInternal,
};
