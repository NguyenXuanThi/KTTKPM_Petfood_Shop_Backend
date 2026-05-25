const axios = require("axios");
const {
  userServiceUrl,
  userServiceTimeoutMs,
  userInternalKey,
} = require("../config/env");

const callUserService = async (config) => {
  try {
    const response = await axios({
      timeout: userServiceTimeoutMs,
      ...config,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const mappedError = new Error(
        error.response.data?.message || "User service request failed",
      );
      mappedError.statusCode = error.response.status;
      throw mappedError;
    }

    const upstreamError = new Error("user-service is unavailable");
    upstreamError.statusCode = 502;
    throw upstreamError;
  }
};

const createUser = async ({ fullName, email, password }) => {
  const data = await callUserService({
    method: "post",
    url: `${userServiceUrl}/users`,
    data: { fullName, email, password },
  });

  return data.user;
};

const getUserByEmail = async (email) => {
  const data = await callUserService({
    method: "get",
    url: `${userServiceUrl}/users/email/${encodeURIComponent(email)}`,
  });

  return data.user;
};

const getUserById = async (id) => {
  const data = await callUserService({
    method: "get",
    url: `${userServiceUrl}/users/internal/${id}`,
  });

  return data.user;
};

const markLastLogin = async (id) => {
  const data = await callUserService({
    method: "patch",
    url: `${userServiceUrl}/users/${id}/last-login`,
  });

  return data.user;
};

const markReactivationRequested = async (id) => {
  const data = await callUserService({
    method: "patch",
    url: `${userServiceUrl}/users/${id}/reactivation-request`,
  });

  return data.user;
};

const resetPassword = async (id, newPassword) => {
  const data = await callUserService({
    method: "patch",
    url: `${userServiceUrl}/users/${id}/password/reset`,
    headers: userInternalKey ? { "x-internal-key": userInternalKey } : {},
    data: { newPassword },
  });

  return data.user;
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  markLastLogin,
  markReactivationRequested,
  resetPassword,
};
