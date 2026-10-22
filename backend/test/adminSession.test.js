const test = require('node:test');
const assert = require('node:assert/strict');

const AdminSession = require('../src/models/AdminSession');
const { createAdminSessionService } = require('../src/services/adminSessionService');

test('admin sessions store hashed refresh tokens and verify active access tokens', async () => {
  let saved;
  const store = {
    create: async (data) => { saved = { _id: 'session-1', ...data }; return saved; },
    findActiveById: async (id, adminId) => id === 'session-1' && adminId === 'admin-1' ? saved : null,
    rotateCurrent: async () => null,
    findByPreviousToken: async () => null,
    revokeById: async () => undefined,
    revokeByToken: async () => undefined,
  };
  const service = createAdminSessionService({
    store,
    env: { JWT_ACCESS_SECRET: 'a-secure-test-secret-that-is-long-enough' },
    createRefreshToken: () => 'plain-refresh-token',
  });
  const session = await service.createSession('admin-1');
  assert.notEqual(saved.currentTokenHash, session.refreshToken);
  const claims = await service.verifyAccessToken(session.accessToken);
  assert.equal(claims.sub, 'admin-1');
  assert.equal(claims.role, 'admin');
});

test('admin session refresh hashes are unique', () => {
  const index = AdminSession.schema.indexes().find(([keys]) => keys.currentTokenHash === 1);
  assert.equal(index?.[1]?.unique, true);
});

test('admin refresh sessions default to thirty days', async () => {
  const now = new Date('2026-10-11T00:00:00.000Z');
  let saved;
  const store = {
    create: async (data) => { saved = { _id: 'session-1', ...data }; return saved; },
    findActiveById: async () => null,
    rotateCurrent: async () => null,
    findByPreviousToken: async () => null,
    revokeById: async () => undefined,
    revokeByToken: async () => undefined,
  };
  const service = createAdminSessionService({
    store,
    env: { JWT_ACCESS_SECRET: 'a-secure-test-secret-that-is-long-enough' },
    clock: () => now,
    createRefreshToken: () => 'refresh-token',
  });

  await service.createSession('admin-1');

  assert.equal(saved.expiresAt.toISOString(), '2026-11-10T00:00:00.000Z');
});

test('refreshing an admin session extends its persistent expiry', async () => {
  const now = new Date('2026-10-11T00:00:00.000Z');
  let rotation;
  const store = {
    create: async () => undefined,
    findActiveById: async () => null,
    rotateCurrent: async (data) => {
      rotation = data;
      return { _id: 'session-1', adminId: 'admin-1', expiresAt: data.nextExpiresAt };
    },
    findByPreviousToken: async () => null,
    revokeById: async () => undefined,
    revokeByToken: async () => undefined,
  };
  const service = createAdminSessionService({
    store,
    env: {
      JWT_ACCESS_SECRET: 'a-secure-test-secret-that-is-long-enough',
      ADMIN_REFRESH_TTL_MS: String(30 * 24 * 60 * 60 * 1000),
    },
    clock: () => now,
    createRefreshToken: () => 'next-refresh-token',
  });

  const session = await service.rotateSession('current-refresh-token');

  assert.equal(rotation.nextExpiresAt.toISOString(), '2026-11-10T00:00:00.000Z');
  assert.equal(session.refreshExpiresAt.toISOString(), '2026-11-10T00:00:00.000Z');
});
