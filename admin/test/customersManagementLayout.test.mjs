import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/CustomersManagement.tsx', import.meta.url),
  'utf8',
);

test('customers management keeps its key metrics compact on mobile', () => {
  assert.match(source, /className="customers-management/);
  assert.match(source, /aria-label="Customer summary"/);
  assert.match(source, /grid-cols-2/);
  assert.match(source, /All-time customer overview/);
  assert.doesNotMatch(source, /grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6/);
});

test('customers management offers responsive customer views and accessible search', () => {
  assert.match(source, /type="search"/);
  assert.match(source, /aria-label="Search customers"/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden[^"\n]*md:block/);
  assert.match(source, /aria-label={`View orders for \${customer\.name}`}/);
  assert.match(source, /No customers match/);
});

test('customer aggregation retrieves existing customers with the same derived key', () => {
  assert.match(source, /const customer = customerMap\.get\(customerKey\)!/);
  assert.doesNotMatch(source, /customerMap\.get\(order\.customerPhone\)!/);
});
