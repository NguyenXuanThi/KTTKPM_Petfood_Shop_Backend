const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const userRepository = require("../repositories/userRepository");
const { bcryptSaltRounds } = require("../config/env");

const ensureObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid user id");
    error.statusCode = 400;
    throw error;
  }
};

const formatUser = (user, includePassword = false) => {
  const payload = {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    inactiveReason: user.inactiveReason || null,
    inactiveAt: user.inactiveAt || null,
    lastLoginAt: user.lastLoginAt || null,
    reactivationRequestedAt: user.reactivationRequestedAt || null,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (includePassword) {
    payload.password = user.password;
  }

  return payload;
};

const getActiveUserById = async (userId) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user || !user.isActive) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const createUser = async ({ fullName, email, password, role }) => {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, bcryptSaltRounds);

  const user = await userRepository.create({
    fullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: role || "user",
    isActive: true,
    inactiveReason: null,
    inactiveAt: null,
    lastLoginAt: null,
    reactivationRequestedAt: null,
    avatarUrl: "",
  });

  return formatUser(user);
};

const getProfile = async (userId) => {
  const user = await getActiveUserById(userId);
  return formatUser(user);
};

const getUserById = async (userId) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return formatUser(user);
};

const getByEmailForAuth = async (email) => {
  const normalizedEmail = email.toLowerCase();

  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return formatUser(user, true);
};

const updateProfile = async (userId, payload) => {
  const user = await getActiveUserById(userId);

  if (payload.fullName !== undefined) {
    user.fullName = payload.fullName;
  }

  if (payload.avatarUrl !== undefined) {
    user.avatarUrl = payload.avatarUrl || "";
  }

  await user.save();

  return formatUser(user);
};

const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await getActiveUserById(userId);

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isOldPasswordValid) {
    const error = new Error("Old password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, bcryptSaltRounds);
  await user.save();

  return formatUser(user);
};

const listUsers = async ({
  page,
  limit,
  email,
  status,
  isActive,
  active,
  inactive,
}) => {
  const data = await userRepository.listUsers({
    page,
    limit,
    email,
    status,
    isActive,
    active,
    inactive,
  });

  return {
    items: data.items.map((item) => formatUser(item)),
    meta: data.meta,
  };
};

const updateRole = async (userId, role) => {
  const user = await getActiveUserById(userId);

  user.role = role;
  await user.save();

  return formatUser(user);
};

const updateStatus = async (userId, isActive) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.isActive = isActive;
  user.inactiveReason = isActive ? null : "Manually deactivated by admin";
  user.inactiveAt = isActive ? null : new Date();
  user.reactivationRequestedAt = isActive ? null : user.reactivationRequestedAt;
  await user.save();

  return formatUser(user);
};

const deactivateUser = async (userId, reason) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.isActive = false;
  user.inactiveReason = reason;
  user.inactiveAt = new Date();
  await user.save();

  return formatUser(user);
};

const activateUser = async (userId) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.isActive = true;
  user.inactiveReason = null;
  user.inactiveAt = null;
  user.reactivationRequestedAt = null;
  await user.save();

  return formatUser(user);
};

const restoreUser = activateUser;

const markLastLogin = async (userId) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.lastLoginAt = new Date();
  await user.save();

  return formatUser(user);
};

const markReactivationRequested = async (userId) => {
  ensureObjectId(userId);

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.isActive) {
    const error = new Error("User account is already active");
    error.statusCode = 400;
    throw error;
  }

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  if (
    user.reactivationRequestedAt &&
    user.reactivationRequestedAt > fifteenMinutesAgo
  ) {
    const error = new Error("Reactivation request was sent recently");
    error.statusCode = 429;
    throw error;
  }

  user.reactivationRequestedAt = new Date();
  await user.save();

  return formatUser(user);
};

const autoDeactivateInactiveUsers = async ({
  days = 30,
  reason = "No login activity for 30 days",
} = {}) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const users = await userRepository.findInactiveCandidates(cutoffDate);
  const inactiveAt = new Date();

  await Promise.all(
    users.map(async (user) => {
      user.isActive = false;
      user.inactiveReason = reason;
      user.inactiveAt = inactiveAt;
      await user.save();
    }),
  );

  return {
    deactivatedCount: users.length,
    cutoffDate,
  };
};

const searchUsers = async (q) => {
  if (!q || q.trim().length < 1) return [];
  return userRepository.searchUsers(q.trim());
};

module.exports = {
  createUser,
  getProfile,
  getUserById,
  getByEmailForAuth,
  updateProfile,
  changePassword,
  listUsers,
  updateRole,
  updateStatus,
  deactivateUser,
  activateUser,
  restoreUser,
  markLastLogin,
  markReactivationRequested,
  autoDeactivateInactiveUsers,
  searchUsers,
};
