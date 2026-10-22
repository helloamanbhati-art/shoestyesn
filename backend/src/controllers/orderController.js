const crypto = require('crypto');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Return = require('../models/Return');
const { CheckoutError, quoteCart } = require('../services/checkoutService');
const inventoryService = require('../services/inventoryService');
const paymentService = require('../services/paymentService');
const { createGuestAccessToken, hashGuestAccessToken, canAccessOrder } = require('../services/guestOrderAccessService');

const cartPopulation = {
  path: 'items.product',
  populate: [
    { path: 'brand', select: 'name slug' },
    { path: 'category', select: 'name slug' },
  ],
};

function sendCheckoutError(error, res, next) {
  if (error instanceof CheckoutError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  return next(error);
}

function savedAddress(customer, addressId) {
  const address = customer.addresses.id(addressId);
  if (!address) throw new CheckoutError('ADDRESS_NOT_FOUND', 'Saved address was not found', 404);
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    houseName: address.houseName || '',
    building: address.building || '',
    street: address.street || '',
    landmark: address.landmark || '',
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country || 'India',
  };
}

function publicQuote(quote) {
  return {
    items: quote.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.price + item.additionalChargeAmount,
      lineTotal: item.total,
    })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    tax: quote.tax,
    shippingCost: quote.shippingCost,
    total: quote.total,
    currency: 'INR',
  };
}

async function loadCart(customerId, session) {
  let query = Cart.findOne({ customer: customerId }).populate(cartPopulation);
  if (session) query = query.session(session);
  const cart = await query;
  if (!cart?.items?.length) throw new CheckoutError('EMPTY_CART', 'Your cart is empty');
  return cart;
}

async function loadGuestCart(items, session) {
  if (!Array.isArray(items) || !items.length) throw new CheckoutError('EMPTY_CART', 'Your cart is empty');
  const ids = [...new Set(items.map((item) => String(item.productId)))];
  let query = Product.find({ _id: { $in: ids } }).populate('brand category');
  if (session) query = query.session(session);
  const products = await query;
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return items.map((item) => ({
    product: byId.get(String(item.productId)),
    variantId: item.variantId || 'default',
    selectedSize: item.selectedSize || null,
    selectedComponents: item.selectedComponents || [],
    selectedColor: item.selectedColor || null,
    meters: item.meters || null,
    quantity: item.quantity,
  }));
}

async function loadCheckoutItems(input, customerId, session) {
  if (input.checkoutMode === 'buyNow') return loadGuestCart(input.items, session);
  return (await loadCart(customerId, session)).items;
}

exports.quoteOrder = async (req, res, next) => {
  try {
    const input = req.validatedData || req.body;
    const customer = req.customer ? await Customer.findById(req.customer._id).select('addresses') : null;
    const address = input.addressId ? savedAddress(customer, input.addressId) : input.shippingAddress;
    const cartItems = req.customer
      ? await loadCheckoutItems(input, req.customer._id)
      : await loadGuestCart(input.items);
    const quote = await quoteCart(cartItems, address.state, input.couponCode, req.customer?._id);
    return res.json({ success: true, data: publicQuote(quote) });
  } catch (error) {
    return sendCheckoutError(error, res, next);
  }
};

exports.createOrder = async (req, res, next) => {
  const input = req.validatedData || req.body;
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key header is required' },
    });
  }

  try {
    const guestAccessToken = req.customer ? null : createGuestAccessToken(idempotencyKey);
    const orderIdentity = req.customer
      ? { customer: req.customer._id, checkoutIdempotencyKey: idempotencyKey }
      : { customer: null, checkoutIdempotencyKey: idempotencyKey };
    let order = await Order.findOne(orderIdentity).select('+guestAccessTokenHash');
    if (!order) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const customer = req.customer ? await Customer.findById(req.customer._id).session(session) : null;
          const address = customer ? savedAddress(customer, input.addressId) : input.guest.shippingAddress;
          const cartItems = customer
            ? await loadCheckoutItems(input, req.customer._id, session)
            : await loadGuestCart(input.items, session);
          const quote = await quoteCart(cartItems, address.state, input.couponCode, customer?._id);

          for (const item of quote.items) {
            await inventoryService.reserveStock(item.product, item.quantity, { session });
          }

          const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
          [order] = await Order.create([{
            orderNumber,
            checkoutIdempotencyKey: idempotencyKey,
            customer: customer?._id || null,
            guestAccessTokenHash: guestAccessToken ? hashGuestAccessToken(guestAccessToken) : undefined,
            customerName: customer?.fullName || address.fullName,
            customerEmail: customer?.email || input.guest?.email || null,
            customerPhone: address.phone,
            items: quote.items.map(({ productId, ...item }) => item),
            subtotal: quote.subtotal,
            discount: quote.discount,
            tax: quote.tax,
            shippingCost: quote.shippingCost,
            total: quote.total,
            couponCode: input.couponCode || null,
            couponDiscount: quote.discount,
            shippingMethod: input.shippingMethod,
            shippingAddress: address,
            paymentMethod: input.paymentMethod,
            customerNotes: input.customerNotes || '',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            statusHistory: [{ status: 'pending', notes: 'Checkout created' }],
          }], { session });

        });
      } finally {
        await session.endSession();
      }
    }

    let razorpayOrder;
    if (order.paymentDetails?.razorpayOrderId) {
      razorpayOrder = {
        id: order.paymentDetails.razorpayOrderId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
      };
    } else {
      try {
        razorpayOrder = await paymentService.createRazorpayOrder(order);
        order.paymentDetails.razorpayOrderId = razorpayOrder.id;
        await order.save();
      } catch (gatewayError) {
        const compensation = await mongoose.startSession();
        try {
          await compensation.withTransaction(async () => {
            const current = await Order.findOne({ _id: order._id, 'stockReservation.status': 'reserved' }).session(compensation);
            if (current) {
              for (const item of current.items) {
                await inventoryService.releaseReservedStock(item.product, item.quantity, { session: compensation });
              }
              current.stockReservation.status = 'released';
              current.stockReservation.releasedAt = new Date();
              current.status = 'cancelled';
              current.statusHistory.push({ status: 'cancelled', notes: 'Payment gateway setup failed' });
              await current.save({ session: compensation });
            }
          });
        } finally {
          await compensation.endSession();
        }
        throw gatewayError;
      }
    }

    // Keep the cart intact until Razorpay has accepted the payment order. This
    // makes gateway outages recoverable and avoids losing the customer's
    // selections when no payment window could be opened.
    if (req.customer && input.checkoutMode !== 'buyNow') {
      await Cart.updateOne(
        { customer: req.customer._id },
        { $set: { items: [] } }
      );
    }

    return res.status(201).json({
      success: true,
      data: { order, razorpayOrder, ...(guestAccessToken ? { guestAccessToken } : {}) },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const order = await Order.findOne(orderIdentity);
      return res.status(200).json({ success: true, data: { order } });
    }
    return sendCheckoutError(error, res, next);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const query = { customer: req.customer._id };
    if (req.query.status) query.status = req.query.status;
    const [orders, total] = await Promise.all([
      Order.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).populate('items.product', 'name image'),
      Order.countDocuments(query),
    ]);
    return res.json({ success: true, data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId).select('+guestAccessTokenHash').populate('items.product');
    if (!order || !canAccessOrder(order, req.customer, req.get('X-Guest-Order-Token'))) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.guestAccessTokenHash = undefined;
    return res.json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

exports.requestReturn = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.customer._id });
    if (!order || order.status !== 'delivered') return res.status(400).json({ success: false, message: 'Order cannot be returned in current status' });
    const request = await Return.create({ order: order._id, customer: req.customer._id, ...req.body, status: 'requested' });
    order.refundStatus = 'requested';
    await order.save();
    return res.status(201).json({ success: true, message: 'Return request created successfully', data: request });
  } catch (error) {
    return next(error);
  }
};

exports.getReturns = async (req, res, next) => {
  try {
    const returns = await Return.find({ customer: req.customer._id }).populate('order').sort({ createdAt: -1 });
    return res.json({ success: true, data: returns });
  } catch (error) {
    return next(error);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        statusHistory: order.statusHistory,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
      },
    });
  } catch (error) {
    return next(error);
  }
};
