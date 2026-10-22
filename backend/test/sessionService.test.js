const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const {
  SessionError,
  createSessionService,
  hashRefreshToken,
  setSessionCookies,
} = require("../src/services/sessionService");

const testEnv = {
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "a-test-access-secret-that-is-longer-than-thirty-two-bytes",
};

function createFixture() {
  let tokenNumber = 0;
  let now = new Date("2026-10-08T10:00:00.000Z");
  const sessions = new Map();

  const store = {
    async create(data) {
      const session = { _id: `session-${sessions.size + 1}`, previousTokenHashes: [], ...data };
      sessions.set(session._id, session);
      return session;
    },
    async rotateCurrent({ tokenHash, nextTokenHash, usedAt }) {
      const session = [...sessions.values()].find(
        (item) =>
          item.currentTokenHash === tokenHash && !item.revokedAt && item.expiresAt > usedAt
      );
      if (!session) return null;
      session.previousTokenHashes.push({ hash: session.currentTokenHash, rotatedAt: usedAt });
      session.currentTokenHash = nextTokenHash;
      session.lastUsedAt = usedAt;
      return session;
    },
    async findByPreviousToken(tokenHash, at) {
      return [...sessions.values()].find(
        (item) =>
          item.previousTokenHashes.some((entry) => entry.hash === tokenHash) &&
          item.expiresAt > at
      ) || null;
    },
    async revokeById(id, revokedAt, reason) {
      const session = sessions.get(id);
      if (session) Object.assign(session, { revokedAt, revocationReason: reason });
    },
    async revokeByToken(tokenHash, revokedAt, reason) {
      const session = [...sessions.values()].find(
        (item) =>
          item.currentTokenHash === tokenHash ||
          item.previousTokenHashes.some((entry) => entry.hash === tokenHash)
      );
      if (session) Object.assign(session, { revokedAt, revocationReason: reason });
    },
    async findActiveById(id, customerId, at) {
      const session = sessions.get(String(id));
      return session &&
        String(session.customerId) === String(customerId) &&
        !session.revokedAt &&
        session.expiresAt > at
        ? session
        : null;
    },
  };

  const service = createSessionService({
    store,
    env: testEnv,
    clock: () => new Date(now),
    createRefreshToken: () => `refresh-token-${++tokenNumber}`,
    createFamilyId: () => "family-1",
  });

  return { service, sessions, advance: (ms) => { now = new Date(now.getTime() + ms); } };
}

test("new sessions persist only a hash of the refresh token", async () => {
  const fixture = createFixture();

  const result = await fixture.service.createCustomerSession("customer-1");
  const stored = fixture.sessions.get("session-1");
  const claims = jwt.verify(result.accessToken, testEnv.JWT_ACCESS_SECRET);

  assert.equal(result.refreshToken, "refresh-token-1");
  assert.equal(stored.currentTokenHash, hashRefreshToken(result.refreshToken));
  assert.notEqual(stored.currentTokenHash, result.refreshToken);
  assert.equal(claims.sub, "customer-1");
  assert.equal(claims.sid, "session-1");
  assert.equal(claims.role, "customer");
});

test("refresh rotates the token and revokes the session when an old token is replayed", async () => {
  const fixture = createFixture();
  const created = await fixture.service.createCustomerSession("customer-1");

  const rotated = await fixture.service.rotateCustomerSession(created.refreshToken);
  assert.equal(rotated.refreshToken, "refresh-token-2");

  await assert.rejects(
    () => fixture.service.rotateCustomerSession(created.refreshToken),
    (error) => error instanceof SessionError && error.code === "REFRESH_TOKEN_REUSED"
  );
  assert.equal(fixture.sessions.get("session-1").revocationReason, "refresh_token_reuse");
});

test("logout revokes a refresh session", async () => {
  const fixture = createFixture();
  const created = await fixture.service.createCustomerSession("customer-1");

  await fixture.service.revokeCustomerSession(created.refreshToken);

  assert.equal(fixture.sessions.get("session-1").revocationReason, "logout");
});

test("session cookies are HttpOnly, secure in production, and scoped", () => {
  const written = [];
  const response = { cookie: (...args) => written.push(args) };

  setSessionCookies(
    response,
    { accessToken: "access", refreshToken: "refresh" },
    { NODE_ENV: "production", AUTH_COOKIE_SAME_SITE: "lax" }
  );

  assert.deepEqual(written.map(([name]) => name), ["gsh_access", "gsh_refresh"]);
  assert.equal(written[0][2].httpOnly, true);
  assert.equal(written[0][2].secure, true);
  assert.equal(written[0][2].sameSite, "lax");
  assert.equal(written[0][2].path, "/");
  assert.equal(written[1][2].path, "/api/v1/auth");
});

test("production cookies default to cross-site delivery for separately hosted storefronts", () => {
  const written = [];
  const response = { cookie: (...args) => written.push(args) };

  setSessionCookies(
    response,
    { accessToken: "access", refreshToken: "refresh" },
    { NODE_ENV: "production" }
  );

  assert.equal(written[0][2].secure, true);
  assert.equal(written[0][2].sameSite, "none");
  assert.equal(written[1][2].secure, true);
  assert.equal(written[1][2].sameSite, "none");
});
