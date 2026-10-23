const mongoose = require('mongoose');

function parsePositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

function buildMongoOptions(env = process.env) {
  return {
    maxPoolSize: parsePositiveInteger(env.MONGODB_MAX_POOL_SIZE, 5, { min: 1, max: 20 }),
    minPoolSize: 0,
    maxIdleTimeMS: parsePositiveInteger(env.MONGODB_MAX_IDLE_MS, 30_000, { min: 1_000, max: 300_000 }),
    serverSelectionTimeoutMS: parsePositiveInteger(env.MONGODB_SELECTION_TIMEOUT_MS, 10_000, { min: 1_000, max: 30_000 }),
    socketTimeoutMS: parsePositiveInteger(env.MONGODB_SOCKET_TIMEOUT_MS, 45_000, { min: 5_000, max: 120_000 }),
    waitQueueTimeoutMS: parsePositiveInteger(env.MONGODB_WAIT_QUEUE_TIMEOUT_MS, 5_000, { min: 500, max: 30_000 }),
    retryWrites: true,
  };
}

async function connectDatabase(uri, env = process.env) {
  if (!uri) throw new Error('MONGODB_URI is missing in environment.');
  return mongoose.connect(uri, buildMongoOptions(env));
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = {
  buildMongoOptions,
  connectDatabase,
  disconnectDatabase,
  parsePositiveInteger,
};
