module.exports = {
  rootDir: "src",
  testEnvironment: "node",
  transform: {},
  moduleNameMapper: {
    "^repositories/(.*)$": "<rootDir>/repositories/$1.js",
    "^services/(.*)$": "<rootDir>/services/$1.js",
  },
};
