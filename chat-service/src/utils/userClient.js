const axios = require("axios");
const config = require("../config/env");

// Get support user from user service
// Try to get one support account - in real scenario, could implement load balancing
async function getSupportUser() {
  try {
    const userServiceUrl = config.USER_SERVICE_URL || "http://localhost:3001";

    // Try multiple endpoints for getting support user
    const endpoints = [
      `${userServiceUrl}/api/users/support`,
      `${userServiceUrl}/api/users/role/support?limit=1`,
      `${userServiceUrl}/api/users?role=support&limit=1`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 3000 });

        if (response.data && response.data.success && response.data.data) {
          const supportUser = Array.isArray(response.data.data)
            ? response.data.data[0]
            : response.data.data;

          if (supportUser && (supportUser._id || supportUser.id)) {
            return {
              success: true,
              data: {
                id: supportUser._id || supportUser.id,
                fullName: supportUser.fullName || supportUser.name || "Support",
                email: supportUser.email || "support@petfood.local",
                role: "support",
              },
            };
          }
        }
      } catch (e) {
        // Try next endpoint
        console.log(`Endpoint ${endpoint} failed:`, e.message);
        continue;
      }
    }

    console.log("getSupportUser: All endpoints failed or returned no data");
    return {
      success: false,
      error: "No support user found from all endpoints",
    };
  } catch (error) {
    console.error("getSupportUser outer error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Alternative: Get random support user from list
async function getRandomSupportUser() {
  try {
    const userServiceUrl = config.USER_SERVICE_URL || "http://localhost:3001";

    // Try multiple endpoints
    const endpoints = [
      `${userServiceUrl}/api/users/role/support`,
      `${userServiceUrl}/api/users?role=support`,
      `${userServiceUrl}/api/users/support`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 3000 });

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.data) &&
          response.data.data.length > 0
        ) {
          const supportUsers = response.data.data;
          const randomSupport =
            supportUsers[Math.floor(Math.random() * supportUsers.length)];

          return {
            success: true,
            data: {
              id: randomSupport._id || randomSupport.id,
              fullName:
                randomSupport.fullName || randomSupport.name || "Support",
              email: randomSupport.email || "support@petfood.local",
              role: "support",
            },
          };
        }
      } catch (e) {
        // Try next endpoint
        console.log(`Endpoint ${endpoint} failed:`, e.message);
        continue;
      }
    }

    console.log(
      "getRandomSupportUser: All endpoints failed or returned no users",
    );
    return {
      success: false,
      error: "No support users found from all endpoints",
    };
  } catch (error) {
    console.error("getRandomSupportUser outer error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  getSupportUser,
  getRandomSupportUser,
};
