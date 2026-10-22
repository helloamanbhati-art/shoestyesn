const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { authLimiter } = require('../src/middleware/rateLimiter');

test('auth rate-limit failures use the structured JSON API contract', async (t) => {
  const app = express();
  app.post('/auth', authLimiter, (_req, res) => res.status(401).json({ success: false }));

  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  let response;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    response = await fetch(`http://127.0.0.1:${port}/auth`, { method: 'POST' });
  }

  assert.equal(response.status, 429);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await response.json(), {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many login attempts. Please try again after 15 minutes.',
      details: { retryAfter: 900 },
    },
  });
});
