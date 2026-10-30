import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/analytics/VisitorTracker.tsx', import.meta.url), 'utf8');

test('storefront visitor tracking uses an anonymous persistent browser id and heartbeat', () => {
  assert.match(source, /crypto\.randomUUID/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /setInterval/);
  assert.match(source, /\/api\/v1\/analytics\/visit/);
});

test('visitor tracking does not collect common personal identifiers', () => {
  assert.doesNotMatch(source, /email|phone|name|address/i);
});
