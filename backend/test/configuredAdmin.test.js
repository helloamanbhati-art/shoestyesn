const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getConfiguredAdminEmail,
  getConfiguredAdminCredentials,
  isConfiguredAdminEmail,
  synchronizeConfiguredAdmin,
} = require('../src/services/configuredAdminService');

const validEnv = {
  ADMIN_EMAIL: 'owner@gujjusstylehub.com',
  ADMIN_PASSWORD: 'a-strong-password-123',
};

test('admin configuration fails closed when credentials are missing or weak', () => {
  assert.throws(() => getConfiguredAdminCredentials({}), /ADMIN_EMAIL/);
  assert.throws(
    () =>
      getConfiguredAdminCredentials({
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'short',
        NODE_ENV: 'production',
      }),
    /at least 12/,
  );
});

test('development allows shorter admin passwords for local setup', () => {
  const creds = getConfiguredAdminCredentials({
    ADMIN_EMAIL: 'owner@example.com',
    ADMIN_PASSWORD: 'short',
    NODE_ENV: 'development',
  });
  assert.equal(creds.password, 'short');
});

test('only the configured email is accepted after normalization', () => {
  assert.equal(isConfiguredAdminEmail(' OWNER@GUJJUSSTYLEHUB.COM ', validEnv), true);
  assert.equal(isConfiguredAdminEmail('another@gujjusstylehub.com', validEnv), false);
});

test('configured admin email can be resolved without a deployment password', () => {
  assert.equal(
    getConfiguredAdminEmail({ ADMIN_EMAIL: ' OWNER@GUJJUSSTYLEHUB.COM ' }),
    validEnv.ADMIN_EMAIL,
  );
});

test('startup synchronization preserves the original password for an existing admin', async () => {
  const actions = [];
  const configuredAdmin = {
    isActive: false,
    role: 'admin',
    password: 'existing-password-hash',
    save: async function save() { actions.push(['save', this.email, this.password, this.isActive, this.role]); },
  };
  const AdminUser = {
    updateMany: async (query, update) => actions.push(['updateMany', query, update]),
    findOne: () => ({
      select: async () => Object.assign(configuredAdmin, { email: validEnv.ADMIN_EMAIL }),
    }),
  };

  await synchronizeConfiguredAdmin({
    AdminUser,
    env: { ADMIN_EMAIL: validEnv.ADMIN_EMAIL, NODE_ENV: 'production' },
  });

  assert.deepEqual(actions[0], [
    'updateMany',
    { email: { $ne: validEnv.ADMIN_EMAIL }, isActive: true },
    { $set: { isActive: false } },
  ]);
  assert.deepEqual(actions[1], [
    'save', validEnv.ADMIN_EMAIL, 'existing-password-hash', true, 'super_admin',
  ]);
});

test('a new admin still requires a secure bootstrap password', async () => {
  const AdminUser = {
    updateMany: async () => undefined,
    findOne: () => ({ select: async () => null }),
    create: async () => assert.fail('admin must not be created without a bootstrap password'),
  };

  await assert.rejects(
    synchronizeConfiguredAdmin({
      AdminUser,
      env: { ADMIN_EMAIL: validEnv.ADMIN_EMAIL, NODE_ENV: 'production' },
    }),
    /ADMIN_PASSWORD/,
  );
});
