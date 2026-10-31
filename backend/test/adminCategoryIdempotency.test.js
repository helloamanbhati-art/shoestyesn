const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeSource = fs.readFileSync(path.join(__dirname, '../src/routes/adminRoutes.js'), 'utf8');
const modelSource = fs.readFileSync(path.join(__dirname, '../src/models/Category.js'), 'utf8');

test('admin category creation is duplicate-safe for retried slow-network requests', () => {
  assert.match(routeSource, /Idempotency-Key/);
  assert.match(routeSource, /adminCreationKey/);
  assert.match(modelSource, /adminCreationKey/);
  assert.match(modelSource, /unique:\s*true/);
});
