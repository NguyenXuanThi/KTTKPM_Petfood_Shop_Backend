const {
  registerSchema,
  loginSchema,
  requestReactivationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidator");
const authService = require("../services/authService");
const { nodeEnv } = require("../config/env");
const { refreshTokenExpiryMs } = require("../utils/token");

/** Cấu hình cookie HttpOnly cho refreshToken */
const COOKIE_NAME = "refreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: nodeEnv === "production",
  sameSite: "strict",
  maxAge: refreshTokenExpiryMs(),
};

const register = async (req, res, next) => {
  try {
    const payload = await registerSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { accessToken, refreshToken, user } =
      await authService.register(payload);

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);

    return res.status(201).json({
      message: "Register successful",
      accessToken,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = await loginSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { accessToken, refreshToken, user } =
      await authService.login(payload);

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.auth.sub);

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

/** Cấp accessToken mới + xoay vòng refreshToken */
const refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies[COOKIE_NAME];

    const { accessToken, refreshToken } =
      await authService.refresh(oldRefreshToken);

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);

    return res.status(200).json({ accessToken });
  } catch (error) {
    return next(error);
  }
};

/** Xóa session và xóa cookie */
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];

    await authService.logout(refreshToken);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: nodeEnv === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return next(error);
  }
};

const requestReactivation = async (req, res, next) => {
  try {
    const { userId } = await requestReactivationSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await authService.requestReactivation(userId);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const payload = await forgotPasswordSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await authService.forgotPassword(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const payload = await resetPasswordSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await authService.resetPassword(payload);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  refresh,
  logout,
  requestReactivation,
  forgotPassword,
  resetPassword,
};
