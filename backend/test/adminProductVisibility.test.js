const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const routes = readFileSync(join(__dirname, '../src/routes/adminRoutes.js'), 'utf8');
const controller = readFileSync(join(__dirname, '../src/controllers/adminController.js'), 'utf8');

test('admin catalog endpoint is protected and uses the complete product query', () => {
  const protection = routes.indexOf('router.use(authenticateAdmin)');
  const endpoint = routes.indexOf('router.get("/products", adminController.getAllProducts)');

  assert.ok(protection >= 0 && endpoint > protection);
  assert.match(controller, /exports\.getAllProducts\s*=\s*async/);
  assert.match(controller, /Product\.find\(\{\}\)/);
});
