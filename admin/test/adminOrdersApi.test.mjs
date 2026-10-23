import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAdminOrderChanges, fetchAllAdminOrders } from '../src/app/api/adminOrders.mjs';

test('fetchAllAdminOrders loads every page of orders in newest-first order', async () => {
  const requestedUrls = [];
  const pages = {
    1: {
      data: [
        { _id: 'newest', createdAt: '2026-10-16T10:00:00.000Z', status: 'pending' },
        { _id: 'confirmed', createdAt: '2026-10-16T09:00:00.000Z', status: 'confirmed' },
      ],
      pagination: { page: 1, pages: 2, total: 3 },
    },
    2: {
      data: [
        { _id: 'older', createdAt: '2026-10-15T10:00:00.000Z', status: 'delivered' },
      ],
      pagination: { page: 2, pages: 2, total: 3 },
    },
  };

  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    const page = Number(new URL(String(url)).searchParams.get('page'));
    return {
      ok: true,
      json: async () => pages[page],
    };
  };

  const orders = await fetchAllAdminOrders(fetchImpl, 'https://example.test', {
    credentials: 'include',
  });

  assert.deepEqual(orders.map(({ _id }) => _id), ['newest', 'confirmed', 'older']);
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /page=1/);
  assert.match(requestedUrls[1], /page=2/);
});

test('fetchAllAdminOrders rejects a failed page instead of showing a partial list', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500 });

  await assert.rejects(
    fetchAllAdminOrders(fetchImpl, 'https://example.test', {}),
    /Orders request failed with status 500/,
  );
});

test('fetchAllAdminOrders supports the production same-origin API base', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({ data: [], pagination: { pages: 1 } }),
    };
  };

  await fetchAllAdminOrders(fetchImpl, '', {});

  assert.equal(requestedUrl, '/api/v1/admin/orders?page=1&limit=100');
});

test('fetchAdminOrderChanges requests only records after the sync cursor', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        data: [{ _id: 'changed-order' }],
        sync: { cursor: '2026-10-23T08:00:03.000Z' },
      }),
    };
  };

  const result = await fetchAdminOrderChanges(
    fetchImpl,
    '',
    '2026-10-23T08:00:00.000Z',
    { credentials: 'include' },
  );

  assert.match(requestedUrl, /\/api\/v1\/admin\/orders\?/);
  assert.match(requestedUrl, /since=2026-10-23T08%3A00%3A00\.000Z/);
  assert.equal(result.orders[0]._id, 'changed-order');
  assert.equal(result.cursor, '2026-10-23T08:00:03.000Z');
});
