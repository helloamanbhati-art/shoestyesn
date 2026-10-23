const ORDER_STATUSES = new Set([
  'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery',
  'delivered', 'cancelled', 'refunded',
]);

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAdminOrderQuery(query = {}) {
  const page = boundedInteger(query.page, 1, 1, 1_000_000);
  const limit = boundedInteger(query.limit, 20, 1, 100);
  const filter = {};

  if (query.status && ORDER_STATUSES.has(query.status)) filter.status = query.status;

  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { orderNumber: { $regex: safeSearch, $options: 'i' } },
      { customerName: { $regex: safeSearch, $options: 'i' } },
      { customerEmail: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  let isIncremental = false;
  if (query.since) {
    const since = new Date(query.since);
    if (Number.isNaN(since.getTime())) {
      const error = new Error('Invalid order sync cursor');
      error.statusCode = 400;
      throw error;
    }
    filter.updatedAt = { $gt: since };
    isIncremental = true;
  }

  return {
    filter,
    isIncremental,
    limit,
    page,
    skip: isIncremental ? 0 : (page - 1) * limit,
    sort: isIncremental ? { updatedAt: 1, _id: 1 } : { createdAt: -1 },
  };
}

module.exports = { buildAdminOrderQuery };
