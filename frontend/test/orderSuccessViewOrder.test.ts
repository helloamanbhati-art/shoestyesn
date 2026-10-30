import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const orderSuccess = readFileSync(
  new URL('../src/app/pages/OrderSuccess.tsx', import.meta.url),
  'utf8',
);
const payment = readFileSync(
  new URL('../src/app/pages/Payment.tsx', import.meta.url),
  'utf8',
);

test('successful checkout offers a direct accessible link to the new order', () => {
  assert.match(orderSuccess, /<Button asChild[^>]*>[\s\S]*?<Link to={`\/order\/\$\{order\._id\}`}[^>]*>View your order<\/Link>[\s\S]*?<\/Button>/);
  assert.match(payment, /to={`\/order\/\$\{order\._id\}`}/);
  assert.match(payment, />View your order<\/Link>/);
});
