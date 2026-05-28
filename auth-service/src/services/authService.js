const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sessionRepository = require("../repositories/sessionRepository");
const { connectRedis } = require("../config/redis");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiryMs,
} = require("../utils/token");
const userClient = require("./userClient");
const notificationClient = require("./notificationClient");

const OTP_TTL_SECONDS = 180;
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_WINDOW_SECONDS = 15 * 60;
const MAX_RESEND_COUNT = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const FORGOT_PASSWORD_MESSAGE =
  "Nếu email tồn tại, mã xác thực sẽ được gửi đến email của bạn.";

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const otpKey = (email) => `otp:reset:${email}`;
const otpCooldownKey = (email) => `otp:reset:cooldown:${email}`;
const otpResendKey = (email) => `otp:reset:resend:${email}`;
const otpAttemptsKey = (email) => `otp:reset:attempts:${email}`;

const createPasswordResetError = (message, statusCode = 400, details = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
};

const getRequiredRedisClient = async () => {
  const client = await connectRedis();
  if (!client) {
    throw createPasswordResetError(
      "Dịch vụ xác thực OTP tạm thời không khả dụng. Vui lòng thử lại sau.",
      503,
    );
  }
  return client;
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
  const normalizedEmail = email.toLowerCase().trim();

  let user;
  try {
    user = await userClient.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.statusCode === 404) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }
    throw error;
  }

  const client = await getRequiredRedisClient();

  const cooldownTtl = await client.ttl(otpCooldownKey(normalizedEmail));
  if (cooldownTtl > 0) {
    throw createPasswordResetError(
      `Vui lòng chờ ${cooldownTtl}s trước khi gửi lại mã`,
      429,
      { remainingSeconds: cooldownTtl },
    );
  }

  const resendCount = Number((await client.get(otpResendKey(normalizedEmail))) || 0);
  if (resendCount >= MAX_RESEND_COUNT) {
    const retryAfterSeconds = Math.max(
      0,
      await client.ttl(otpResendKey(normalizedEmail)),
    );
    throw createPasswordResetError(
      "Bạn đã gửi mã quá nhiều lần. Vui lòng thử lại sau 15 phút",
      429,
      { retryAfterSeconds },
    );
  }

  const otp = generateOtp();
  const payload = {
    userId: String(user.id || user._id),
    email: normalizedEmail,
    otpHash: await bcrypt.hash(otp, 10),
    createdAt: new Date().toISOString(),
  };

  await client.set(otpKey(normalizedEmail), JSON.stringify(payload), "EX", OTP_TTL_SECONDS);
  await client.set(otpCooldownKey(normalizedEmail), "1", "EX", RESEND_COOLDOWN_SECONDS);
  const nextResendCount = await client.incr(otpResendKey(normalizedEmail));
  if (nextResendCount === 1) {
    await client.expire(otpResendKey(normalizedEmail), RESEND_WINDOW_SECONDS);
  }
  await client.del(otpAttemptsKey(normalizedEmail));

  await notificationClient.sendPasswordResetOtp({ email: normalizedEmail, otp });
  return {
    message: FORGOT_PASSWORD_MESSAGE,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    otpExpiresIn: OTP_TTL_SECONDS,
  };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const client = await getRequiredRedisClient();
  const rawOtp = await client.get(otpKey(normalizedEmail));

  if (!rawOtp) {
    throw createPasswordResetError("Mã xác thực đã hết hạn", 400);
  }

  const attempts = Number((await client.get(otpAttemptsKey(normalizedEmail))) || 0);
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await client.del(otpKey(normalizedEmail));
    throw createPasswordResetError(
      "Bạn đã nhập sai quá số lần cho phép",
      429,
    );
  }

  let resetOtp;
  try {
    resetOtp = JSON.parse(rawOtp);
  } catch (error) {
    await client.del(otpKey(normalizedEmail));
    throw createPasswordResetError("Mã xác thực không hợp lệ", 400);
  }

  const isOtpValid = await bcrypt.compare(otp, resetOtp.otpHash);

  if (!isOtpValid) {
    const nextAttempts = await client.incr(otpAttemptsKey(normalizedEmail));
    if (nextAttempts === 1) {
      await client.expire(otpAttemptsKey(normalizedEmail), OTP_TTL_SECONDS);
    }
    if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
      await client.del(otpKey(normalizedEmail));
    }

    throw createPasswordResetError(
      nextAttempts >= MAX_VERIFY_ATTEMPTS
        ? "Bạn đã nhập sai quá số lần cho phép"
        : "Mã xác thực không hợp lệ",
      nextAttempts >= MAX_VERIFY_ATTEMPTS ? 429 : 400,
    );
  }

  await userClient.resetPassword(resetOtp.userId, newPassword);
  await client.del(
    otpKey(normalizedEmail),
    otpCooldownKey(normalizedEmail),
    otpAttemptsKey(normalizedEmail),
  );
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




