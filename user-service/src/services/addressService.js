const mongoose = require("mongoose");
const addressRepository = require("../repositories/addressRepository");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureObjectId = (id, message = "Invalid id") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(message, 400);
  }
};

const formatAddress = (address) => ({
  id: address._id.toString(),
  userId: address.userId.toString(),
  fullName: address.fullName,
  phone: address.phone,
  province: address.province,
  district: address.district,
  ward: address.ward,
  detailAddress: address.detailAddress,
  label: address.label,
  isDefault: address.isDefault,
  createdAt: address.createdAt,
  updatedAt: address.updatedAt,
});

const toShippingSnapshot = (address) => ({
  fullName: address.fullName,
  phone: address.phone,
  province: address.province,
  district: address.district,
  ward: address.ward,
  detailAddress: address.detailAddress,
});

const listMyAddresses = async (userId) => {
  ensureObjectId(userId, "Invalid user id");
  const addresses = await addressRepository.listByUserId(userId);
  return addresses.map(formatAddress);
};

const createAddress = async (userId, payload) => {
  ensureObjectId(userId, "Invalid user id");

  const currentCount = await addressRepository.countByUserId(userId);
  const isDefault = currentCount === 0;

  if (isDefault) {
    await addressRepository.unsetDefaultByUserId(userId);
  }

  const address = await addressRepository.create({
    userId,
    ...payload,
    isDefault,
  });

  return formatAddress(address);
};

const updateAddress = async (userId, addressId, payload) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(addressId, "Invalid address id");

  const address = await addressRepository.findByIdAndUserId(addressId, userId);

  if (!address) {
    throw createError("Address not found", 404);
  }

  Object.assign(address, payload);
  await address.save();

  return formatAddress(address);
};

const setDefaultAddress = async (userId, addressId) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(addressId, "Invalid address id");

  const address = await addressRepository.findByIdAndUserId(addressId, userId);

  if (!address) {
    throw createError("Address not found", 404);
  }

  await addressRepository.unsetDefaultByUserId(userId, addressId);

  address.isDefault = true;
  await address.save();

  return formatAddress(address);
};

const deleteAddress = async (userId, addressId) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(addressId, "Invalid address id");

  const address = await addressRepository.findByIdAndUserId(addressId, userId);

  if (!address) {
    throw createError("Address not found", 404);
  }

  const wasDefault = address.isDefault;

  await addressRepository.deleteOneById(addressId);

  if (wasDefault) {
    const candidate = await addressRepository.findFirstByUserId(userId);
    if (candidate) {
      await addressRepository.unsetDefaultByUserId(userId, candidate._id);
      candidate.isDefault = true;
      await candidate.save();
    }
  }
};

const getAddressSnapshotInternal = async ({ userId, addressId }) => {
  ensureObjectId(userId, "Invalid user id");
  ensureObjectId(addressId, "Invalid address id");

  const address = await addressRepository.findByIdAndUserId(addressId, userId);

  if (!address) {
    throw createError("Address not found", 404);
  }

  return {
    id: address._id.toString(),
    userId: address.userId.toString(),
    shippingAddress: toShippingSnapshot(address),
  };
};

module.exports = {
  listMyAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getAddressSnapshotInternal,
};
