const User = require("../models/User");

const create = async (payload) => User.create(payload);

const findById = async (id) => User.findById(id);

const findByEmail = async (email) => User.findOne({ email });

const listUsers = async ({
  page,
  limit,
  email,
  status,
  isActive,
  active,
  inactive,
}) => {
  const filter = {};

  if (email) {
    filter.email = {
      $regex: email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  if (status === "active" || isActive === true || active === true) {
    filter.isActive = true;
  }

  if (
    status === "inactive" ||
    isActive === false ||
    active === false ||
    inactive === true
  ) {
    filter.isActive = false;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const searchUsers = async (q) => {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = { $regex: escaped, $options: "i" };

  return User.find({
    $or: [{ fullName: regex }, { email: regex }],
  })
    .select("_id fullName email avatarUrl")
    .limit(10)
    .lean();
};

const findInactiveCandidates = async (cutoffDate) =>
  User.find({
    isActive: true,
    lastLoginAt: { $ne: null, $lte: cutoffDate },
  });

module.exports = {
  create,
  findById,
  findByEmail,
  listUsers,
  searchUsers,
  findInactiveCandidates,
};
