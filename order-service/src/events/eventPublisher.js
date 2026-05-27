const publishEvent = async (eventName, payload = {}) => {
  console.log(`[order-service:event:no-op] ${eventName}`, payload);
  return { published: false, transport: "noop" };
};

module.exports = { publishEvent };
