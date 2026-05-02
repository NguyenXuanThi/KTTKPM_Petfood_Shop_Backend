const bcrypt = require("bcryptjs");
const sessionRepository = require("../repositories/sessionRepository");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiryMs,
} = require("../utils/token");
const userClient = require("./userClient");
const notificationClient = require("./notificationClient");

const createSession = async (userId) => {
  const refreshToken = signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + refreshTokenExpiryMs());

  await sessionRepository.create({ userId, refreshToken, expiresAt });

  return refreshToken;
};

const normalizeUser = (user) => ({
  id: String(user.id || user._id),
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  inactiveReason: user.inactiveReason || null,
  inactiveAt: user.inactiveAt || null,
  lastLoginAt: user.lastLoginAt || null,
  reactivationRequestedAt: user.reactivationRequestedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureUserIsActiveForAuth = (user) => {
  if (user.isActive === false) {
    const error = new Error("Your account is inactive");
    error.statusCode = 403;
    error.reason = user.inactiveReason || "Account is inactive";
    error.canRequestReactivation = true;
    error.userId = String(user.id || user._id);
    throw error;
  }
};

const register = async ({ fullName, email, password }) => {
  const user = await userClient.createUser({ fullName, email, password });

  const accessToken = signAccessToken(user);
  const refreshToken = await createSession(user.id);

  return { accessToken, refreshToken, user: normalizeUser(user) };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();

  let user;
  try {
    user = await userClient.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.statusCode === 404) {
      const authError = new Error("Invalid email or password");
      authError.statusCode = 401;
      throw authError;
    }
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  ensureUserIsActiveForAuth(user);

  const updatedUser = await userClient.markLastLogin(user.id);

  const accessToken = signAccessToken(updatedUser);
  const refreshToken = await createSession(user.id);

  return { accessToken, refreshToken, user: normalizeUser(updatedUser) };
};

const getProfile = async (userId) => {
  const user = await userClient.getUserById(userId);
  ensureUserIsActiveForAuth(user);
  return normalizeUser(user);
};

const refresh = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    const error = new Error("Refresh token not found");
    error.statusCode = 401;
    throw error;
  }

  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const session = await sessionRepository.findOneAndDelete({
    refreshToken: oldRefreshToken,
  });

  if (!session) {
    const error = new Error("Session not found or already revoked");
    error.statusCode = 401;
    throw error;
  }

  const user = await userClient.getUserById(payload.sub);
  ensureUserIsActiveForAuth(user);

  const accessToken = signAccessToken(user);
  const newRefreshToken = await createSession(user.id);

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    await sessionRepository.findOneAndDelete({ refreshToken });
  }
};

const requestReactivation = async (userId) => {
  const user = await userClient.getUserById(userId);

  if (user.isActive !== false) {
    const error = new Error("User account is already active");
    error.statusCode = 400;
    throw error;
  }

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const requestedAt = user.reactivationRequestedAt
    ? new Date(user.reactivationRequestedAt)
    : null;

  if (requestedAt && requestedAt > fifteenMinutesAgo) {
    const error = new Error("Reactivation request was sent recently");
    error.statusCode = 429;
    throw error;
  }

  await notificationClient.sendReactivationRequest({
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    inactiveReason: user.inactiveReason || "Account is inactive",
  });

  await userClient.markReactivationRequested(user.id);

  return {
    message: "Reactivation request sent to admin",
  };
};

module.exports = {
  register,
  login,
  getProfile,
  refresh,
  logout,
  requestReactivation,
};
