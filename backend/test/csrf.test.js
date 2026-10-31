const test = require('node:test');
const assert = require('node:assert/strict');
const { getAllowedOrigins, requireTrustedOrigin, validateProductionAdminOrigin } = require('../src/middleware/csrf');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('cookie-authenticated admin mutations reject an untrusted origin', () => {
  const request = {
    method: 'POST',
    originalUrl: '/api/v1/admin/products',
    headers: { cookie: 'gsh_admin_access=token' },
    get: () => 'https://evil.example',
  };
  const response = responseRecorder();
  let continued = false;
  requireTrustedOrigin(request, response, () => { continued = true; });
  assert.equal(continued, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, 'UNTRUSTED_ORIGIN');
});

test('configured storefront origin can mutate with a customer cookie', () => {
  const previous = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = 'https://shop.example';
  try {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/cart/items',
      headers: { cookie: 'gsh_access=token' },
      get: () => 'https://shop.example',
    };
    let continued = false;
    requireTrustedOrigin(request, responseRecorder(), () => { continued = true; });
    assert.equal(continued, true);
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previous;
  }
});

test('production startup rejects a missing or insecure admin origin', () => {
  assert.throws(
    () => validateProductionAdminOrigin({ NODE_ENV: 'production' }),
    /ADMIN_URL/,
  );
  assert.throws(
    () => validateProductionAdminOrigin({
      NODE_ENV: 'production', ADMIN_URL: 'http://admin.example.com',
      ALLOWED_ORIGINS: 'http://admin.example.com',
    }),
    /HTTPS/,
  );
  assert.doesNotThrow(() => validateProductionAdminOrigin({
    NODE_ENV: 'production', ADMIN_URL: 'https://admin.example.com',
    ALLOWED_ORIGINS: 'https://shop.example.com',
  }));
});

test('Shoe Style production domains remain trusted when hosting environment values are stale', () => {
  const origins = getAllowedOrigins({
    NODE_ENV: 'production',
    ADMIN_URL: 'https://old-admin.example.com',
    FRONTEND_URL: 'https://old-store.example.com',
  });

  assert.ok(origins.includes('https://admin.sarojinishoestyle.com'));
  assert.ok(origins.includes('https://sarojinishoestyle.com'));
  assert.ok(origins.includes('https://www.sarojinishoestyle.com'));
  assert.equal(origins.includes('https://evil.example'), false);
});
