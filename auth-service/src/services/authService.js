const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const PasswordResetOtp = require("../models/PasswordResetOtp");
const sessionRepository = require("../repositories/sessionRepository");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiryMs,
} = require("../utils/token");
const userClient = require("./userClient");
const notificationClient = require("./notificationClient");

const OTP_TTL_MS = 180 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_RESEND_COUNT = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const FORGOT_PASSWORD_MESSAGE =
  "Nếu email tồn tại, mã xác thực sẽ được gửi đến email của bạn.";

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const getActivePasswordResetOtp = (email) =>
  PasswordResetOtp.findOne({
    email,
    usedAt: null,
    invalidatedAt: null,
  }).sort({ createdAt: -1 });

const createPasswordResetError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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

const forgotPassword = async ({ email }) => {
  const normalizedEmail = email.toLowerCase();

  let user;
  try {
    user = await userClient.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.statusCode === 404) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }
    throw error;
  }

  const now = new Date();
  const activeOtp = await getActivePasswordResetOtp(normalizedEmail);

  if (activeOtp) {
    if (activeOtp.lockedUntil && activeOtp.lockedUntil > now) {
      throw createPasswordResetError(
        "Bạn đã gửi lại mã quá số lần cho phép. Vui lòng thử lại sau.",
        429,
      );
    }

    if (activeOtp.resendAvailableAt && activeOtp.resendAvailableAt > now) {
      throw createPasswordResetError(
        "Vui lòng chờ trước khi gửi lại mã",
        429,
      );
    }

    const windowStartedAt = activeOtp.resendWindowStartedAt || activeOtp.createdAt;
    const isSameWindow = now.getTime() - windowStartedAt.getTime() <= RESEND_WINDOW_MS;
    const nextResendCount = isSameWindow ? activeOtp.resendCount + 1 : 1;

    if (nextResendCount > MAX_RESEND_COUNT) {
      activeOtp.lockedUntil = new Date(now.getTime() + RESEND_WINDOW_MS);
      await activeOtp.save();
      throw createPasswordResetError(
        "Bạn đã gửi lại mã quá số lần cho phép. Vui lòng thử lại sau.",
        429,
      );
    }

    activeOtp.invalidatedAt = now;
    await activeOtp.save();

    const otp = generateOtp();
    await PasswordResetOtp.create({
      email: normalizedEmail,
      userId: user.id || user._id,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
      resendCount: nextResendCount,
      resendWindowStartedAt: isSameWindow ? windowStartedAt : now,
    });

    await notificationClient.sendPasswordResetOtp({ email: normalizedEmail, otp });
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  const otp = generateOtp();
  await PasswordResetOtp.create({
    email: normalizedEmail,
    userId: user.id || user._id,
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
    resendCount: 0,
    resendWindowStartedAt: now,
  });

  await notificationClient.sendPasswordResetOtp({ email: normalizedEmail, otp });
  return { message: FORGOT_PASSWORD_MESSAGE };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();
  const resetOtp = await getActivePasswordResetOtp(normalizedEmail);

  if (!resetOtp) {
    throw createPasswordResetError("Mã xác thực không hợp lệ", 400);
  }

  if (resetOtp.lockedUntil && resetOtp.lockedUntil > now) {
    throw createPasswordResetError(
      "Bạn đã nhập sai quá số lần cho phép",
      429,
    );
  }

  if (resetOtp.expiresAt <= now) {
    resetOtp.invalidatedAt = now;
    await resetOtp.save();
    throw createPasswordResetError("Mã xác thực đã hết hạn", 400);
  }

  if (resetOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
    resetOtp.lockedUntil = new Date(now.getTime() + RESEND_WINDOW_MS);
    await resetOtp.save();
    throw createPasswordResetError(
      "Bạn đã nhập sai quá số lần cho phép",
      429,
    );
  }

  const isOtpValid = await bcrypt.compare(otp, resetOtp.otpHash);

  if (!isOtpValid) {
    resetOtp.attempts += 1;
    if (resetOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
      resetOtp.lockedUntil = new Date(now.getTime() + RESEND_WINDOW_MS);
    }
    await resetOtp.save();

    throw createPasswordResetError(
      resetOtp.attempts >= MAX_VERIFY_ATTEMPTS
        ? "Bạn đã nhập sai quá số lần cho phép"
        : "Mã xác thực không hợp lệ",
      resetOtp.attempts >= MAX_VERIFY_ATTEMPTS ? 429 : 400,
    );
  }

  await userClient.resetPassword(resetOtp.userId, newPassword);
  resetOtp.usedAt = now;
  await resetOtp.save();
  await sessionRepository.deleteManyByUserId(resetOtp.userId);

  return { message: "Đặt lại mật khẩu thành công" };
};

module.exports = {
  register,
  login,
  getProfile,
  refresh,
  logout,
  requestReactivation,
  forgotPassword,
  resetPassword,
};
