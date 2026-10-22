const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-that-is-at-least-32-characters';

const orderController = require('../src/controllers/orderController');
const orderRoutes = require('../src/routes/orderRoutes');

test('customers have no endpoint or controller action for cancelling placed orders', () => {
  const customerRoutes = orderRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

  assert.equal(customerRoutes.includes('POST /:orderId/cancel'), false);
  assert.equal(orderController.cancelOrder, undefined);
});
