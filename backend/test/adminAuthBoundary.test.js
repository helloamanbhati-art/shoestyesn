const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const authMiddleware = readFileSync(join(__dirname, '../src/middleware/auth.js'), 'utf8');
const adminRoutes = readFileSync(join(__dirname, '../src/routes/adminRoutes.js'), 'utf8');
const sessionService = readFileSync(join(__dirname, '../src/services/adminSessionService.js'), 'utf8');

test('admin access accepts session cookies only and rejects legacy bearer-token fallback', () => {
  const adminAuthSection = authMiddleware.match(
    /\/\/ Authenticate Admin[\s\S]*?\/\/ Authenticate Customer or Admin/,
  )?.[0] || '';

  assert.doesNotMatch(sessionService, /authorization\.startsWith\('Bearer '\)/);
  assert.doesNotMatch(adminAuthSection, /authorization|jwt\.decode|dev-access-secret-change-me/);
  assert.match(adminAuthSection, /getAdminTokens\(req\)/);
  assert.match(adminAuthSection, /isConfiguredAdminEmail\(admin\.email\)/);
});

test('admin login queries only the configured email and returns generic failures', () => {
  assert.match(adminRoutes, /getConfiguredAdminCredentials/);
  assert.match(adminRoutes, /isConfiguredAdminEmail\(email/);
  assert.doesNotMatch(adminRoutes, /findOne\(\{ email: email\.toLowerCase\(\)\.trim\(\) \}\)/);
  assert.match(adminRoutes, /Invalid email or password/);
});
