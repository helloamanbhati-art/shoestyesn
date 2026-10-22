import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/CategoriesManagement.tsx', import.meta.url),
  'utf8',
);

test('categories management keeps its summary compact on mobile', () => {
  assert.match(source, /className="categories-management/);
  assert.match(source, /aria-label="Category summary"/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /min-h-\[7rem\]/);
  assert.doesNotMatch(source, /grid-cols-1 md:grid-cols-3 gap-6/);
});

test('categories management uses accessible category cards instead of a cramped table', () => {
  assert.match(source, /aria-label={`Edit \${category\.name}`}/);
  assert.match(source, /aria-label={`Delete \${category\.name}`}/);
  assert.match(source, /<h2 className="truncate text-base font-bold">/);
  assert.doesNotMatch(source, /<table/);
  assert.doesNotMatch(source, /bg-gradient-to-/);
});
