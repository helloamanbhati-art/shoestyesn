import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const legacyLoginSource = readFileSync(
  new URL('../src/app/pages/admin/AdminLogin.tsx', import.meta.url),
  'utf8',
);

test('storefront legacy admin login redirects to the backend-backed admin portal', () => {
  assert.match(legacyLoginSource, /VITE_ADMIN_URL/);
  assert.match(legacyLoginSource, /window\.location\.replace\(ADMIN_LOGIN_URL\)/);
  assert.doesNotMatch(legacyLoginSource, /admin123|Demo Credentials|localStorage\.setItem\('adminAuth'/);
});
