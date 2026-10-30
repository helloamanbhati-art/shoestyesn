import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const router = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const guard = readFileSync(new URL('../src/app/components/admin/ProtectedAdminRoute.tsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('../src/app/pages/admin/Login.tsx', import.meta.url), 'utf8');
const authContext = readFileSync(new URL('../src/app/contexts/AdminAuthContext.tsx', import.meta.url), 'utf8');
const apiClient = readFileSync(new URL('../src/app/api/client.ts', import.meta.url), 'utf8');

test('every admin page is wrapped in a server-confirmed authentication guard', () => {
  assert.match(router, /element: <ProtectedAdminRoute \/>/);
  assert.match(guard, /if \(loading\)/);
  assert.match(guard, /if \(!admin\) return <Navigate to="\/admin\/login" replace/);
  assert.match(guard, /return <AdminLayout \/>/);
});

test('an already authenticated admin is redirected away from the login page', () => {
  assert.match(login, /const \{ admin, loading: authLoading, login \} = useAdminAuth\(\)/);
  assert.match(login, /if \(admin\) return <Navigate to="\/admin" replace \/>/);
});

test('login is accepted only after the browser proves the session cookie persisted', () => {
  assert.match(authContext, /await adminRequest<\{ admin: AdminUser \}>\('\/api\/v1\/admin\/auth\/login'/);
  assert.match(authContext, /const verified = await adminRequest<\{ admin: AdminUser \}>\('\/api\/v1\/admin\/auth\/me'\)/);
  assert.match(authContext, /setAdmin\(verified\.admin\)/);
});

test('an unrecoverable authenticated 401 clears stale admin state', () => {
  assert.match(apiClient, /setAdminUnauthorizedHandler/);
  assert.match(apiClient, /unauthorizedHandler\?\.\(\)/);
  assert.match(authContext, /setAdminUnauthorizedHandler\(\(\) => setAdmin\(null\)\)/);
});
