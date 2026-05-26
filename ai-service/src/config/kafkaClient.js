const { Kafka, logLevel } = require('kafkajs');

/**
 * Singleton Kafka client for ai-service.
 *
 * Config is read lazily (inside the factory) so that dotenv has already
 * populated process.env before the Kafka instance is created.
 *
 * Connection is best-effort: if the broker is unavailable the service
 * continues to work via HTTP fallback in productClient.js.
 */

let _kafka = null;

function getKafka() {
  if (_kafka) return _kafka;

  // Read env lazily — dotenv must have been loaded by server.js first
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map((b) => b.trim());

  const nodeEnv = process.env.NODE_ENV || 'development';

  _kafka = new Kafka({
    clientId: 'ai-service',
    brokers,
    // Suppress ALL kafkajs internal logs — we show our own warning in productKafkaConsumer
    logLevel: logLevel.NOTHING,
    retry: {
      initialRetryTime: 1000,
      retries: 3,
    },
    connectionTimeout: 3000,
    requestTimeout: 5000,
  });

  return _kafka;
}

module.exports = { getKafka };

