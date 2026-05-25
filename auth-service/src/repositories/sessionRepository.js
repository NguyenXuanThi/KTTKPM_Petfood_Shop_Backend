const Session = require("../models/Session");

const create = async (payload) => Session.create(payload);

const findOneAndDelete = async (filter) => Session.findOneAndDelete(filter);

const deleteManyByUserId = async (userId) => Session.deleteMany({ userId });

module.exports = {
  create,
  findOneAndDelete,
  deleteManyByUserId,
};
