const axios = require("axios");
const { userServiceUrl, userServiceTimeoutMs } = require("../config/env");

const callUserService = async (config) => {
  try {
    const response = await axios({
      timeout: userServiceTimeoutMs,
      ...config,
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const notFound = new Error("User not found");
      notFound.statusCode = 404;
      throw notFound;
    }

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

const getUserSnapshot = async (userId) => {
  const data = await callUserService({
    method: "get",
    url: `${userServiceUrl}/users/internal/${userId}`,
  });

  if (!data?.user) {
    const error = new Error("Invalid response from user-service");
    error.statusCode = 502;
    throw error;
  }

  return {
    fullName: data.user.fullName,
    avatarUrl: data.user.avatarUrl || "",
  };
};

module.exports = {
  getUserSnapshot,
};