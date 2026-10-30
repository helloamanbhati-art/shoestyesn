import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/api/client.ts', import.meta.url),
  'utf8',
);
const apiBaseUrlSource = readFileSync(
  new URL('../src/app/api/apiBaseUrl.mjs', import.meta.url),
  'utf8',
);

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('deployed admin uses a same-origin API proxy for reliable session cookies', () => {
  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(apiBaseUrlSource, /if \(!dev\) return ''/);
  assert.doesNotMatch(source, /VITE_API_URL \|\| 'http:\/\/localhost:3000'/);
  assert.deepEqual(vercel.rewrites[0], {
    source: '/api/:path*',
    destination: 'https://gaggu-s-3.onrender.com/api/:path*',
  });
});

test('admin screens share the production-safe API base instead of localhost fallbacks', () => {
  const files = globSync(['src/app/**/*.ts', 'src/app/**/*.tsx'], {
    cwd: new URL('..', import.meta.url),
  });
  for (const file of files) {
    const fileSource = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(fileSource, /VITE_API_URL \|\| 'http:\/\/localhost:3000'/, file);
  }
});
