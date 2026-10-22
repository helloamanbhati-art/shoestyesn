require('dotenv').config();

const mongoose = require('mongoose');
const AuthSession = require('../src/models/AuthSession');
const Cart = require('../src/models/Cart');
const Customer = require('../src/models/Customer');
const Order = require('../src/models/Order');
const inventoryService = require('../src/services/inventoryService');
const { createSessionService } = require('../src/services/sessionService');

const baseUrl = process.env.E2E_API_URL || 'http://localhost:3000';
const origin = process.env.FRONTEND_URL || 'http://localhost:5173';

async function request(path, accessToken, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Origin: origin,
      ...(init.body && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function main() {
  if (process.env.E2E_ALLOW_SESSION_BOOTSTRAP !== 'true') {
    throw new Error('Set E2E_ALLOW_SESSION_BOOTSTRAP=true to run this local-only smoke test');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = `${Date.now()}`.slice(-8);
  let customer;
  let session;
  const results = [];

  const record = (step, ok, detail) => results.push({ step, ok, detail });

  try {
    const health = await request('/health');
    record('API health', health.response.ok && health.body?.status === 'ok', health.body?.status || health.response.status);

    const catalog = await request('/api/v1/products?limit=1');
    const product = catalog.body?.data?.[0];
    if (!product) throw new Error('Catalog did not return a product');
    const stockBefore = Number(product.stock?.available || 0);
    record('Catalog', true, `${product.name}; ${product.availableSizes?.length || 0} sizes`);

    customer = await Customer.create({
      firstName: 'E2E',
      lastName: 'Tester',
      email: `e2e-${suffix}@example.com`,
      phone: `+9198${suffix}`,
      isVerified: true,
      phoneVerifiedAt: new Date(),
    });
    session = await createSessionService().createCustomerSession(customer._id);
    record('Authenticated session', true, 'Ephemeral test customer session created');

    const variant = product.variants?.[0];
    const size = product.availableSizes?.[0] || null;
    const cart = await request('/api/v1/cart/items', session.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        productId: product._id,
        variantId: variant?.variantId || 'default',
        selectedSize: size,
        selectedColor: variant?.variantName || null,
        meters: null,
        quantity: 1,
      }),
    });
    record('Size and cart', cart.response.status === 201 && cart.body?.data?.summary?.totalItems === 1, `HTTP ${cart.response.status}; size ${size}`);

    const address = await request('/api/v1/auth/addresses', session.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        type: 'home', fullName: 'E2E Tester', phone: customer.phone,
        addressLine1: '1 Test Road', addressLine2: '', houseName: '1',
        building: 'Test Building', street: 'Test Road', landmark: '',
        city: 'Jodhpur', state: 'Rajasthan', zipCode: '342024',
        country: 'India', isDefault: true,
      }),
    });
    const addressId = address.body?.data?.address?.id;
    record('Address', address.response.status === 201 && Boolean(addressId), `HTTP ${address.response.status}`);

    const quote = await request('/api/v1/orders/quote', session.accessToken, {
      method: 'POST',
      body: JSON.stringify({ addressId, couponCode: '' }),
    });
    record('Authoritative quote', quote.response.ok && quote.body?.data?.total > 0, `HTTP ${quote.response.status}; INR ${quote.body?.data?.total || 0}`);

    const idempotencyKey = `e2e_${crypto.randomUUID().replaceAll('-', '')}`;
    const checkoutInput = {
      addressId, paymentMethod: 'razorpay', shippingMethod: 'standard',
      couponCode: '', customerNotes: 'Automated E2E checkout smoke test',
    };
    const checkout = await request('/api/v1/orders', session.accessToken, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(checkoutInput),
    });
    record(
      'Razorpay order',
      checkout.response.status === 201 && Boolean(checkout.body?.data?.razorpayOrder?.id),
      checkout.response.ok
        ? `HTTP ${checkout.response.status}; accepted by Razorpay`
        : `HTTP ${checkout.response.status}; ${checkout.body?.error?.code || 'UNKNOWN_ERROR'}: ${checkout.body?.error?.message || 'Request failed'}`,
    );

    if (checkout.response.ok) {
      const replay = await request('/api/v1/orders', session.accessToken, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(checkoutInput),
      });
      record(
        'Idempotent retry',
        replay.response.ok && replay.body?.data?.order?._id === checkout.body?.data?.order?._id,
        replay.response.ok ? 'Same checkout returned the same internal order' : `HTTP ${replay.response.status}`,
      );

      const forgedVerification = await request('/api/v1/payments/verify', session.accessToken, {
        method: 'POST',
        body: JSON.stringify({
          orderId: checkout.body.data.order._id,
          razorpayOrderId: checkout.body.data.razorpayOrder.id,
          razorpayPaymentId: 'pay_forged_e2e',
          razorpaySignature: 'forged_signature',
        }),
      });
      record(
        'Forged payment rejection',
        !forgedVerification.response.ok,
        `HTTP ${forgedVerification.response.status}; payment was not marked paid`,
      );
    }

    const cartAfter = await request('/api/v1/cart', session.accessToken);
    const expectedItems = checkout.response.ok ? 0 : 1;
    record('Cart lifecycle', cartAfter.body?.data?.summary?.totalItems === expectedItems, `${cartAfter.body?.data?.summary?.totalItems} items after checkout attempt`);

    const productAfter = await request(`/api/v1/products/${product._id}`);
    const expectedStock = checkout.response.ok ? stockBefore - 1 : stockBefore;
    record('Inventory lifecycle', Number(productAfter.body?.data?.stock?.available) === expectedStock, `stock ${productAfter.body?.data?.stock?.available}; expected ${expectedStock}`);
  } finally {
    if (customer) {
      const orders = await Order.find({ customer: customer._id });
      for (const order of orders) {
        if (order.stockReservation?.status === 'reserved') {
          for (const item of order.items) {
            await inventoryService.releaseReservedStock(item.product, item.quantity);
          }
        }
      }
      await Promise.all([
        Order.deleteMany({ customer: customer._id }),
        Cart.deleteMany({ customer: customer._id }),
        AuthSession.deleteMany({ customerId: customer._id }),
        Customer.deleteOne({ _id: customer._id }),
      ]);
      record('Cleanup', true, 'Ephemeral customer, cart, session, and orders removed');
    }
    await mongoose.disconnect();
  }

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

const crypto = require('crypto');

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error.message }));
  process.exitCode = 1;
});
