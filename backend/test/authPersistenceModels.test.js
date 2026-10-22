const test = require("node:test");
const assert = require("node:assert/strict");

const AuthSession = require("../src/models/AuthSession");

test("auth sessions expire automatically and store a unique current refresh hash", () => {
  const indexes = AuthSession.schema.indexes();
  const ttl = indexes.find(([keys]) => keys.expiresAt === 1);
  const token = indexes.find(([keys]) => keys.currentTokenHash === 1);

  assert.equal(ttl[1].expireAfterSeconds, 0);
  assert.equal(token[1].unique, true);
});
