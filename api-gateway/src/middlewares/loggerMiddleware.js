const morgan = require("morgan");

const loggerMiddleware = morgan(":method :url :status :response-time ms");

module.exports = {
  loggerMiddleware,
};
