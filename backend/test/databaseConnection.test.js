const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMongoOptions,
  parsePositiveInteger,
} = require('../src/config/database');

test('database pool defaults stay within a small free-tier connection budget', () => {
  assert.deepEqual(buildMongoOptions({}), {
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    waitQueueTimeoutMS: 5_000,
    retryWrites: true,
  });
});

test('database pool settings accept bounded positive environment overrides', () => {
  assert.equal(parsePositiveInteger('8', 5, { min: 1, max: 20 }), 8);
  assert.equal(parsePositiveInteger('100', 5, { min: 1, max: 20 }), 20);
  assert.equal(parsePositiveInteger('invalid', 5, { min: 1, max: 20 }), 5);
  assert.equal(buildMongoOptions({ MONGODB_MAX_POOL_SIZE: '10' }).maxPoolSize, 10);
});
