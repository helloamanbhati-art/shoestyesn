import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(
  new URL('../src/app/pages/Home.tsx', import.meta.url),
  'utf8',
);

test('home campaign provides an immersive mobile and desktop hero', () => {
  assert.match(homeSource, /aria-labelledby="campaign-heading"[^\n]+min-h-\[62svh\][^\n]+md:min-h-\[calc\(100svh-112px\)\]/);
  assert.match(homeSource, /WALK LOUD/);
});
