import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvoiceHtml } from '../src/app/utils/invoicePresentation.mjs';

const order = {
  id: 'order-123',
  orderNumber: 'SS-2026-00123',
  customerName: 'Asha & Co.',
  customerEmail: 'asha@example.com',
  customerPhone: '9876543210',
  createdAt: '2026-10-28T06:30:00.000Z',
  shippingAddress: {
    fullName: 'Asha Shah',
    houseName: '12 <Market> Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
  },
  items: [
    {
      id: 'item-1',
      productName: 'Classic Pump',
      productId: 'pump-1',
      price: 1000,
      quantity: 2,
      size: '38',
      selectedVariant: { sku: 'CP-38', color: 'Black', priceAtPurchase: 900 },
    },
  ],
  subtotal: 1800,
  tax: 324,
  total: 2124,
  paymentMethod: 'Razorpay',
  paymentStatus: 'paid',
};

test('createInvoiceHtml renders a printable tax invoice from the order snapshot', () => {
  const html = createInvoiceHtml(order);

  assert.match(html, /Tax Invoice/);
  assert.match(html, /SS-2026-00123/);
  assert.match(html, /Classic Pump/);
  assert.match(html, /CP-38/);
  assert.match(html, /900\.00/);
  assert.match(html, /2,124\.00/);
  assert.match(html, /@media print/);
});
test('createInvoiceHtml escapes customer-controlled invoice fields', () => {
  const html = createInvoiceHtml(order);

  assert.match(html, /Asha &amp; Co\./);
  assert.match(html, /12 &lt;Market&gt; Road/);
  assert.doesNotMatch(html, /12 <Market> Road/);
});
