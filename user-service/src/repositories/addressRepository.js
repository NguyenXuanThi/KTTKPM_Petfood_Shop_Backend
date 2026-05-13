const Address = require("../models/Address");

const create = async (payload) => Address.create(payload);

const countByUserId = async (userId) => Address.countDocuments({ userId });

const findById = async (id) => Address.findById(id);

const findByIdAndUserId = async (id, userId) => Address.findOne({ _id: id, userId });

const listByUserId = async (userId) =>
  Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1, createdAt: -1 });

const unsetDefaultByUserId = async (userId, exceptId = null) => {
  const filter = exceptId
    ? { userId, _id: { $ne: exceptId }, isDefault: true }
    : { userId, isDefault: true };

  await Address.updateMany(filter, { $set: { isDefault: false } });
};

const findFirstByUserId = async (userId) =>
  Address.findOne({ userId }).sort({ createdAt: 1 });

const deleteOneById = async (id) => Address.deleteOne({ _id: id });

module.exports = {
  create,
  countByUserId,
  findById,
  findByIdAndUserId,
  listByUserId,
  unsetDefaultByUserId,
  findFirstByUserId,
  deleteOneById,
};
