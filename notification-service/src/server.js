const app = require("./app");
const { port } = require("./config/env");

app.listen(port, () => {
  console.log(`notification-service is running on port ${port}`);
});
