const PAGE_SIZE = 100;

export async function fetchAllAdminOrders(fetchImpl, apiBaseUrl, requestOptions) {
  const orders = [];
  const seenOrderIds = new Set();
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    const url = `${apiBaseUrl}/api/v1/admin/orders?${query}`;

    const response = await fetchImpl(url, requestOptions);
    if (!response.ok) {
      throw new Error(`Orders request failed with status ${response.status}`);
    }

    const payload = await response.json();
    for (const order of payload.data || []) {
      const orderId = String(order._id || order.id || '');
      if (!orderId || seenOrderIds.has(orderId)) continue;
      seenOrderIds.add(orderId);
      orders.push(order);
    }

    totalPages = Math.max(1, Number(payload.pagination?.pages) || 1);
    page += 1;
  } while (page <= totalPages);

  return orders;
}
