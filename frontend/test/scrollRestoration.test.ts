import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');

test('storefront navigation starts new pages at the top and preserves browser history positions', () => {
  assert.match(layout, /import\s*\{[^}]*ScrollRestoration[^}]*\}\s*from\s*['"]react-router['"]/);
  assert.match(layout, /<ScrollRestoration\s*\/>/);
});
