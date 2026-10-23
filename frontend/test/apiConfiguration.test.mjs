import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/api/client.ts', import.meta.url),
  'utf8',
);
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('customer login never falls back to localhost in a production build', () => {
  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(source, /https:\/\/gaggu-s-3\.onrender\.com/);
  assert.doesNotMatch(source, /configuredApiUrl \|\| 'http:\/\/localhost:3000'/);
});

test('public product share links are rendered by the backend before the SPA fallback', () => {
  assert.deepEqual(vercel.rewrites[0], {
    source: '/share/product/:id',
    destination: 'https://gaggu-s-3.onrender.com/share/product/:id',
  });
  assert.deepEqual(vercel.rewrites.at(-1), {
    source: '/(.*)',
    destination: '/index.html',
  });
});

test('storefront social metadata uses the custom public domain', () => {
  assert.match(indexHtml, /https:\/\/shoefashion\.in/);
  assert.doesNotMatch(indexHtml, /amanbhati\.vercel\.app/);
});
