const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenRequestPromise = null;
const serviceabilityCache = new Map();
const DEFAULT_ITEM_PACKAGE = Object.freeze({
  weightKg: 0.5,
  lengthCm: 25,
  breadthCm: 18,
  heightCm: 10,
});
const SERVICEABILITY_CACHE_TTL_MS = 45_000;

class ShiprocketError extends Error {
  constructor(code, message, statusCode = 502, retryable = false) {
    super(message);
    this.name = 'ShiprocketError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

function getConfiguration(env = process.env) {
  return {
    email: String(env.SHIPROCKET_EMAIL || '').trim(),
    password: String(env.SHIPROCKET_PASSWORD || ''),
    pickupPincode: String(env.SHIPROCKET_PICKUP_PINCODE || '').trim(),
    pickupLocation: String(env.SHIPROCKET_PICKUP_LOCATION || '').trim(),
    webhookSecret: String(env.SHIPROCKET_WEBHOOK_SECRET || ''),
  };
}

function hasCredentials(env = process.env) {
  const config = getConfiguration(env);
  return Boolean(config.email && config.password);
}

function requireConfiguration({ pickup = false, booking = false } = {}) {
  const config = getConfiguration();
  if (!config.email || !config.password) {
    throw new ShiprocketError('SHIPROCKET_NOT_CONFIGURED', 'Delivery availability is temporarily unavailable.', 503);
  }
  if (pickup && !/^\d{6}$/.test(config.pickupPincode)) {
    throw new ShiprocketError('SHIPROCKET_PICKUP_NOT_CONFIGURED', 'Delivery availability is temporarily unavailable.', 503);
  }
  if (booking && !config.pickupLocation) {
    throw new ShiprocketError('SHIPROCKET_PICKUP_NOT_CONFIGURED', 'Shipping pickup location is not configured.', 503);
  }
  return config;
}

function parseResponse(response, payload) {
  if (response.ok) return payload;
  const status = response.status;
  if (status === 401) {
    throw new ShiprocketError('SHIPROCKET_AUTH_FAILED', 'Shiprocket authentication failed.', 502, true);
  }
  if (status === 429 || status >= 500) {
    throw new ShiprocketError('SHIPROCKET_TEMPORARILY_UNAVAILABLE', 'Shipping service is temporarily unavailable.', 503, true);
  }
  throw new ShiprocketError('SHIPROCKET_REQUEST_REJECTED', 'Shiprocket could not process this request.', 502, false);
}

async function request(path, { method = 'GET', token, body, query, retryAuth = true } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw new ShiprocketError(
      timeout ? 'SHIPROCKET_TIMEOUT' : 'SHIPROCKET_NETWORK_ERROR',
      'Shipping service is temporarily unavailable.',
      503,
      true,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (response.status === 401 && token && retryAuth) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return request(path, { method, token: await getToken(true), body, query, retryAuth: false });
  }
  if (!response.ok && response.status === 404 && path.startsWith('/shipments/')) {
    throw new ShiprocketError('SHIPROCKET_SHIPMENT_NOT_FOUND', 'Shipment details are temporarily unavailable.', 503, true);
  }
  return parseResponse(response, payload);
}

async function getToken(force = false) {
  if (!force && cachedToken && Date.now() < tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) return cachedToken;
  if (tokenRequestPromise) return tokenRequestPromise;
  tokenRequestPromise = (async () => {
    const config = requireConfiguration();
    const response = await request('/auth/login', {
      method: 'POST',
      body: { email: config.email, password: config.password },
      retryAuth: false,
    });
    if (typeof response?.token !== 'string' || !response.token) {
      throw new ShiprocketError('SHIPROCKET_AUTH_RESPONSE_INVALID', 'Shipping service is temporarily unavailable.', 503, true);
    }
    cachedToken = response.token;
    // Shiprocket documents a 10 day token lifetime. Refresh early and keep it only in process memory.
    tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
    return cachedToken;
  })();
  try { return await tokenRequestPromise; }
  finally { tokenRequestPromise = null; }
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function buildParcel(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ShiprocketError('PACKAGE_DATA_MISSING', 'Shipping details are incomplete for this item.', 409);
  }
  let weight = 0;
  let length = 0;
  let breadth = 0;
  let height = 0;
  for (const item of items) {
    const quantity = Number(item.quantity);
    const itemWeight = positiveNumber(item.shippingWeightKg) || DEFAULT_ITEM_PACKAGE.weightKg;
    const itemLength = positiveNumber(item.shippingLengthCm) || DEFAULT_ITEM_PACKAGE.lengthCm;
    const itemBreadth = positiveNumber(item.shippingBreadthCm) || DEFAULT_ITEM_PACKAGE.breadthCm;
    const itemHeight = positiveNumber(item.shippingHeightCm) || DEFAULT_ITEM_PACKAGE.heightCm;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ShiprocketError('PACKAGE_DATA_MISSING', 'Shipping details are incomplete for this item.', 409);
    }
    weight += itemWeight * quantity;
    length = Math.max(length, itemLength);
    breadth = Math.max(breadth, itemBreadth);
    // Treat each catalog measurement as one packed unit and stack units along
    // the height axis. This avoids underquoting when a cart has multiples.
    height += itemHeight * quantity;
  }
  if (weight > 1000 || length > 500 || breadth > 500 || height > 500) {
    throw new ShiprocketError('PACKAGE_LIMIT_EXCEEDED', 'This parcel is outside supported shipping limits.', 422);
  }
  return {
    weight: Number(weight.toFixed(3)),
    length: Math.ceil(length),
    breadth: Math.ceil(breadth),
    height: Math.ceil(height),
  };
}

function normalizeCouriers(payload) {
  const couriers = payload?.data?.available_courier_companies;
  if (!Array.isArray(couriers)) return [];
  return couriers.map((courier) => ({
    courierId: Number(courier.courier_company_id) || null,
    name: String(courier.courier_name || '').slice(0, 100),
    rate: positiveNumber(courier.freight_charge ?? courier.rate),
    etd: String(courier.etd || courier.estimated_delivery_days || '').slice(0, 80),
  })).filter((courier) => courier.courierId && courier.name && courier.rate !== null)
    .sort((a, b) => a.rate - b.rate);
}

async function checkServiceability({ deliveryPincode, parcel, declaredValue = 0, shiprocketOrderId, forceRefresh = false } = {}) {
  const config = requireConfiguration({ pickup: true });
  if (!/^\d{6}$/.test(String(deliveryPincode || ''))) {
    throw new ShiprocketError('INVALID_DELIVERY_PINCODE', 'Enter a valid six-digit PIN code.', 400);
  }
  const params = {
    pickup_postcode: config.pickupPincode,
    delivery_postcode: deliveryPincode,
    ...(shiprocketOrderId
      ? { order_id: shiprocketOrderId }
      : {
          cod: 0,
          weight: parcel?.weight,
          length: parcel?.length,
          breadth: parcel?.breadth,
          height: parcel?.height,
          declared_value: Math.max(0, Math.round(Number(declaredValue) || 0)),
        }),
  };
  if (!shiprocketOrderId && (!positiveNumber(params.weight) || !positiveNumber(params.length)
    || !positiveNumber(params.breadth) || !positiveNumber(params.height))) {
    throw new ShiprocketError('PACKAGE_DATA_MISSING', 'Shipping details are incomplete for this item.', 409);
  }
  const cacheKey = JSON.stringify(params);
  const cached = serviceabilityCache.get(cacheKey);
  if (!forceRefresh && !shiprocketOrderId && cached && cached.expiresAt > Date.now()) return cached.result;
  const payload = await request('/courier/serviceability/', { token: await getToken(), query: params });
  const couriers = normalizeCouriers(payload);
  const result = {
    available: couriers.length > 0,
    couriers: couriers.slice(0, 10),
    selected: couriers[0] || null,
  };
  if (!shiprocketOrderId) {
    serviceabilityCache.set(cacheKey, { result, expiresAt: Date.now() + SERVICEABILITY_CACHE_TTL_MS });
    if (serviceabilityCache.size > 500) {
      for (const [key, value] of serviceabilityCache) if (value.expiresAt <= Date.now()) serviceabilityCache.delete(key);
      if (serviceabilityCache.size > 500) serviceabilityCache.delete(serviceabilityCache.keys().next().value);
    }
  }
  return result;
}

async function checkPincodeServiceability({ deliveryPincode } = {}) {
  const config = requireConfiguration({ pickup: true });
  if (!/^\d{6}$/.test(String(deliveryPincode || ''))) {
    throw new ShiprocketError('INVALID_DELIVERY_PINCODE', 'Enter a valid six-digit PIN code.', 400);
  }

  // Shiprocket requires a weight even for a PIN-level availability lookup.
  // Use a small standard parcel only for this preliminary estimate; checkout
  // rechecks using the actual order package before payment.
  const params = {
    pickup_postcode: config.pickupPincode,
    delivery_postcode: deliveryPincode,
    cod: 0,
    weight: 0.5,
  };
  const cacheKey = `pin-estimate:${JSON.stringify(params)}`;
  const cached = serviceabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const payload = await request('/courier/serviceability/', { token: await getToken(), query: params });
  const couriers = normalizeCouriers(payload);
  const result = {
    available: couriers.length > 0,
    couriers: couriers.slice(0, 10),
    selected: couriers[0] || null,
  };
  serviceabilityCache.set(cacheKey, { result, expiresAt: Date.now() + SERVICEABILITY_CACHE_TTL_MS });
  if (serviceabilityCache.size > 500) {
    for (const [key, value] of serviceabilityCache) {
      if (value.expiresAt <= Date.now()) serviceabilityCache.delete(key);
    }
    if (serviceabilityCache.size > 500) serviceabilityCache.delete(serviceabilityCache.keys().next().value);
  }
  return result;
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts.shift() || '', last: parts.join(' ') };
}

function createOrderPayload(order, config) {
  const address = order.shippingAddress || {};
  const name = splitName(order.customerName || address.fullName);
  const parcel = order.fulfillment?.package || buildParcel(order.items);
  const phone = String(order.customerPhone || address.phone || '').replace(/\D/g, '');
  const email = String(order.customerEmail || '').trim();
  if (!name.first || !phone || !email || !address.zipCode || !address.city || !address.state) {
    throw new ShiprocketError('SHIPMENT_CONTACT_INCOMPLETE', 'Order delivery details are incomplete.', 409);
  }
  const orderDate = new Date(order.createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' ');
  return {
    order_id: String(order.orderNumber).slice(0, 50),
    order_date: orderDate,
    pickup_location: config.pickupLocation,
    billing_customer_name: name.first,
    billing_last_name: name.last,
    billing_address: String(address.addressLine1 || [address.houseName, address.building, address.street].filter(Boolean).join(', ')).slice(0, 190),
    billing_address_2: String(address.landmark || address.addressLine2 || '').slice(0, 190),
    billing_city: String(address.city).slice(0, 80),
    billing_pincode: Number(address.zipCode),
    billing_state: String(address.state).slice(0, 80),
    billing_country: String(address.country || 'India').slice(0, 80),
    billing_email: email,
    billing_phone: Number(phone.slice(-10)),
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: String(item.productName || 'Product').slice(0, 200),
      sku: String(item.selectedVariant?.sku || item.product?.sku || item.product || item._id).slice(0, 100),
      units: item.quantity,
      selling_price: Number((Number(item.price) + Number(item.additionalChargeAmount || 0)).toFixed(2)),
      discount: Number(item.discount || 0),
      tax: Number(item.tax || 0),
    })),
    payment_method: 'Prepaid',
    shipping_charges: Number(order.shippingCost || 0),
    total_discount: Number(order.discount || 0),
    sub_total: Number(order.subtotal || 0),
    length: parcel.length,
    breadth: parcel.breadth,
    height: parcel.height,
    weight: parcel.weight,
  };
}

async function createShipmentOrder(order) {
  const config = requireConfiguration({ booking: true });
  const token = await getToken();
  const sourceOrderId = String(order.orderNumber).slice(0, 50);
  const existing = await request('/orders', {
    token,
    query: { filter_by: 'channel_order_id', filter: sourceOrderId, per_page: 10 },
  });
  const rows = Array.isArray(existing?.data) ? existing.data
    : Array.isArray(existing?.data?.data) ? existing.data.data
      : Array.isArray(existing?.orders) ? existing.orders : [];
  const matched = rows.find((item) => String(
    item.channel_order_id
      || item.channel_order?.order_id
      || item.channel_order?.channel_order_id
      || '',
  ) === sourceOrderId);
  if (matched) {
    const shipment = matched.shipments?.[0] || matched.shipment || matched.shipment_details?.[0] || {};
    const shipmentId = matched.shipment_id || shipment.id || shipment.shipment_id;
    const shiprocketOrderId = matched.id || matched.order_id;
    if (!shipmentId || !shiprocketOrderId) {
      throw new ShiprocketError('SHIPROCKET_EXISTING_ORDER_UNRESOLVED', 'Shiprocket order is being reconciled. Retry synchronization shortly.', 503, true);
    }
    return { order_id: shiprocketOrderId, shipment_id: shipmentId, status: matched.status || 'NEW' };
  }
  return request('/orders/create/adhoc', { method: 'POST', token, body: createOrderPayload(order, config) });
}

async function assignCourier(shipmentId, courierId) {
  return request('/courier/assign/awb', {
    method: 'POST', token: await getToken(), body: { shipment_id: shipmentId, courier_id: courierId },
  });
}

async function requestPickup(shipmentId) {
  return request('/courier/generate/pickup', {
    method: 'POST', token: await getToken(), body: { shipment_id: [shipmentId] },
  });
}

async function generateLabel(shipmentId) {
  return request('/courier/generate/label', {
    method: 'POST', token: await getToken(), body: { shipment_id: [shipmentId] },
  });
}

async function generateManifest(shipmentId) {
  return request('/manifests/generate', {
    method: 'POST', token: await getToken(), body: { shipment_id: [shipmentId] },
  });
}

async function getShipment(shipmentId) {
  return request(`/shipments/${encodeURIComponent(String(shipmentId))}`, { token: await getToken() });
}

module.exports = {
  ShiprocketError,
  assignCourier,
  buildParcel,
  checkServiceability,
  checkPincodeServiceability,
  createOrderPayload,
  createShipmentOrder,
  generateLabel,
  generateManifest,
  getShipment,
  getConfiguration,
  hasCredentials,
  normalizeCouriers,
  requestPickup,
};
