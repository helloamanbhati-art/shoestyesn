import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const router = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const guard = readFileSync(new URL('../src/app/components/admin/ProtectedAdminRoute.tsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('../src/app/pages/admin/Login.tsx', import.meta.url), 'utf8');

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
