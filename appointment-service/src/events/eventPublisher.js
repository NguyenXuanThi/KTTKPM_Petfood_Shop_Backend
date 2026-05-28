const publishEvent = async (eventName, payload = {}) => {
  console.log(`[appointment-service:event:no-op] ${eventName}`, payload);
  return { published: false, transport: "noop" };
};

module.exports = { publishEvent };
