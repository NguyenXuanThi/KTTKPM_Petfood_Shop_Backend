const cron = require("node-cron");
const userService = require("../services/userService");

const startInactiveUsersJob = () => {
  cron.schedule("0 2 * * *", async () => {
    try {
      const result = await userService.autoDeactivateInactiveUsers();
      console.log(
        `[inactive-users-job] Deactivated ${result.deactivatedCount} users inactive since ${result.cutoffDate.toISOString()}`,
      );
    } catch (error) {
      console.error("[inactive-users-job] Failed", error);
    }
  });
};

module.exports = {
  startInactiveUsersJob,
};
