const crypto = require('crypto');
const mongoose = require('mongoose');
const WebhookEvent = require('../models/WebhookEvent');
const Order = require('../models/Order');
const inventoryService = require('../services/inventoryService');
const { safeErrorCode } = require('../services/shiprocketFulfillmentService');

function validWebhookSecret(received, expected) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(String(received), 'utf8');
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function mapShipmentStatus(value) {
  const status = String(value || '').trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (status.includes('RTO') || status.includes('RETURN')) return null;
  if (status.includes('DELIVERED')) return 'delivered';
  if (status.includes('OUT FOR DELIVERY') || status === 'OFD') return 'out_for_delivery';
  if (['IN TRANSIT', 'PICKED UP', 'SHIPPED', 'REACHED AT DESTINATION', 'HANDOVER TO COURIER'].some((label) => status.includes(label))) return 'shipped';
  return null;
}

function statusRank(status) {
  return ({ pending: 0, confirmed: 1, processing: 2, shipped: 3, out_for_delivery: 4, delivered: 5 })[status] ?? -1;
}

async function applyTrackingEvent(payload) {
  const awb = String(payload?.awb || '').trim().slice(0, 100);
  const providerStatus = String(payload?.current_status || payload?.shipment_status || '').trim().slice(0, 120);
  if (!awb || !providerStatus) {
    const error = new Error('Invalid tracking event.');
    error.statusCode = 400;
    error.code = 'INVALID_TRACKING_EVENT';
    throw error;
  }

  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ 'fulfillment.awbCode': awb }).session(session);
      if (!order) return;
      const nextStatus = mapShipmentStatus(providerStatus);
      order.fulfillment.providerStatus = providerStatus;
      order.fulfillment.lastTrackingAt = new Date();
      order.fulfillment.updatedAt = new Date();
      const isPaid = order.paymentStatus === 'paid';
      const statusAllowsFulfillment = !['cancelled', 'refunded'].includes(order.status);
      if (nextStatus && isPaid && statusAllowsFulfillment && statusRank(nextStatus) > statusRank(order.status)) {
        if (nextStatus === 'delivered' && order.stockReservation?.status === 'reserved') {
          for (const item of order.items) {
            await inventoryService.confirmStockUsage(item.product, item.quantity, { session, size: item.size });
          }
          order.stockReservation.status = 'consumed';
          order.stockReservation.consumedAt = new Date();
        }
        order.status = nextStatus;
        if (nextStatus === 'delivered') order.deliveredAt = new Date();
        order.statusHistory.push({ status: nextStatus, updatedAt: new Date(), notes: `Shiprocket tracking update: ${providerStatus}` });
      }
      await order.save({ session });
      result = { orderId: String(order._id), status: order.status };
    });
  } finally {
    await session.endSession();
  }
  return result;
}

exports.handleWebhook = async (req, res, next) => {
  let eventId;
  try {
    const secret = String(process.env.SHIPROCKET_WEBHOOK_SECRET || '');
    if (!secret) return res.status(503).json({ success: false, error: { code: 'SHIPROCKET_WEBHOOK_NOT_CONFIGURED', message: 'Tracking updates are temporarily unavailable.' } });
    if (!validWebhookSecret(req.get('x-api-key'), secret)) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_WEBHOOK_KEY', message: 'Invalid webhook key.' } });
    }
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    eventId = String(req.get('x-shiprocket-event-id') || payloadHash).slice(0, 200);

    try {
      await WebhookEvent.create({ provider: 'shiprocket', eventId, eventType: String(req.body?.shipment_status || req.body?.current_status || 'tracking').slice(0, 100), payloadHash, status: 'processing' });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const retry = await WebhookEvent.findOneAndUpdate(
        { provider: 'shiprocket', eventId, status: 'failed' },
        { $set: { status: 'processing', lastError: null, payloadHash } },
        { new: true },
      );
      if (!retry) return res.status(200).json({ success: true, duplicate: true });
    }

    await applyTrackingEvent(req.body);
    await WebhookEvent.updateOne(
      { provider: 'shiprocket', eventId },
      { $set: { status: 'processed', processedAt: new Date(), lastError: null } },
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    if (eventId) {
      await WebhookEvent.updateOne(
        { provider: 'shiprocket', eventId },
        { $set: { status: 'failed', lastError: safeErrorCode(error) } },
      ).catch(() => undefined);
    }
    return next(error);
  }
};
