const publishEvent = async (eventName, payload = {}) => {
  console.log(`[payment-service:event:no-op] ${eventName}`, payload);
  return { published: false, transport: "noop" };
};

module.exports = { publishEvent };
