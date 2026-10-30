import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/OrdersManagement.tsx', import.meta.url),
  'utf8',
);

test('orders expose invoice printing from the table and detail header', () => {
  assert.match(source, /Print invoice/);
  assert.match(source, /handlePrintInvoice/);
  assert.match(source, /createInvoiceHtml/);
  assert.match(source, /window\.open/);
});
