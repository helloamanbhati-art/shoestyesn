const mongoose = require('mongoose');
const FulfillmentJob = require('../models/FulfillmentJob');
const Order = require('../models/Order');
const shiprocketService = require('./shiprocketService');

const JOB_TYPE = 'create_shiprocket_order';
const MAX_ATTEMPTS = 10;
const LOCK_MS = 60_000;

function safeErrorCode(error) {
  return /^SHIPROCKET_[A-Z_]+$/.test(String(error?.code || '')) ? error.code : 'SHIPROCKET_SYNC_FAILED';
}

async function enqueuePaidOrder(orderId) {
  if (!mongoose.isValidObjectId(orderId)) return null;
  const order = await Order.findOne({ _id: orderId, paymentStatus: 'paid', status: { $nin: ['cancelled', 'refunded'] } });
  if (!order || order.fulfillment?.shiprocketOrderId) return null;
  const now = new Date();
  const job = await FulfillmentJob.findOneAndUpdate(
    { order: order._id, type: JOB_TYPE },
    { $setOnInsert: { order: order._id, type: JOB_TYPE, status: 'pending', availableAt: now } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (job.status !== 'failed') {
    await Order.updateOne(
      { _id: order._id, paymentStatus: 'paid', 'fulfillment.shiprocketOrderId': { $exists: false } },
      { $set: { 'fulfillment.syncStatus': 'queued', 'fulfillment.updatedAt': now } },
    );
  }
  return job;
}

async function processOneJob() {
  const now = new Date();
  const job = await FulfillmentJob.findOneAndUpdate(
    {
      type: JOB_TYPE,
      $or: [
        { status: 'pending', availableAt: { $lte: now } },
        { status: 'processing', lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: { status: 'processing', lockedUntil: new Date(now.getTime() + LOCK_MS) },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { availableAt: 1, createdAt: 1 } },
  );
  if (!job) return false;

  const order = await Order.findById(job.order);
  if (!order || order.paymentStatus !== 'paid' || ['cancelled', 'refunded'].includes(order.status)) {
    job.status = 'completed';
    job.completedAt = new Date();
    job.lockedUntil = undefined;
    await job.save();
    return true;
  }
  if (order.fulfillment?.shiprocketOrderId) {
    job.status = 'completed';
    job.completedAt = new Date();
    job.lockedUntil = undefined;
    await job.save();
    return true;
  }

  try {
    const response = await shiprocketService.createShipmentOrder(order);
    const shiprocketOrderId = response?.order_id;
    const shipmentId = response?.shipment_id;
    if (!shiprocketOrderId || !shipmentId) {
      throw new shiprocketService.ShiprocketError('SHIPROCKET_RESPONSE_INVALID', 'Shiprocket order could not be confirmed.', 502, true);
    }
    order.fulfillment.shiprocketOrderId = String(shiprocketOrderId);
    order.fulfillment.shipmentId = String(shipmentId);
    order.fulfillment.syncStatus = 'synced';
    order.fulfillment.providerStatus = String(response.status || 'NEW').slice(0, 80);
    order.fulfillment.lastErrorCode = undefined;
    order.fulfillment.updatedAt = new Date();
    await order.save();
    job.status = 'completed';
    job.completedAt = new Date();
    job.lockedUntil = undefined;
    job.lastErrorCode = undefined;
    await job.save();
  } catch (error) {
    const code = safeErrorCode(error);
    const terminal = error?.retryable === false || job.attempts >= MAX_ATTEMPTS;
    job.status = terminal ? 'failed' : 'pending';
    job.lastErrorCode = code;
    job.lockedUntil = undefined;
    job.availableAt = new Date(Date.now() + Math.min(30_000 * (2 ** Math.max(job.attempts - 1, 0)), 60 * 60 * 1000));
    await job.save();
    await Order.updateOne(
      { _id: order._id },
      { $set: {
        'fulfillment.syncStatus': terminal ? 'failed' : 'queued',
        'fulfillment.lastErrorCode': code,
        'fulfillment.updatedAt': new Date(),
      } },
    );
  }
  return true;
}

async function retryOrderSync(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (order.paymentStatus !== 'paid') {
    const error = new Error('Only paid orders can be synchronized to Shiprocket.');
    error.statusCode = 409;
    error.code = 'ORDER_NOT_PAID';
    throw error;
  }
  if (['cancelled', 'refunded'].includes(order.status) || order.paymentStatus === 'refunded') {
    const error = new Error('Cancelled or refunded orders cannot be synchronized.');
    error.statusCode = 409;
    error.code = 'ORDER_NOT_SHIPPABLE';
    throw error;
  }
  if (order.fulfillment?.shiprocketOrderId) return order;
  const existingJob = await FulfillmentJob.findOne({ order: order._id, type: JOB_TYPE });
  if (existingJob?.status === 'processing' && existingJob.lockedUntil > new Date()) {
    const error = new Error('Order synchronization is already in progress.');
    error.statusCode = 409;
    error.code = 'FULFILLMENT_SYNC_IN_PROGRESS';
    throw error;
  }
  await FulfillmentJob.findOneAndUpdate(
    { order: order._id, type: JOB_TYPE },
    { $set: { status: 'pending', availableAt: new Date(), lockedUntil: null, lastErrorCode: null }, $setOnInsert: { order: order._id, type: JOB_TYPE } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  order.fulfillment.syncStatus = 'queued';
  order.fulfillment.lastErrorCode = undefined;
  order.fulfillment.updatedAt = new Date();
  await order.save();
  return order;
}

async function bookPackedOrder(orderId, adminId) {
  let order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    error.code = 'ORDER_NOT_FOUND';
    throw error;
  }
  if (order.paymentStatus !== 'paid' || !order.fulfillment?.shipmentId) {
    const error = new Error('This order is not ready for shipping.');
    error.statusCode = 409;
    error.code = 'ORDER_NOT_READY_TO_SHIP';
    throw error;
  }
  if (['cancelled', 'refunded'].includes(order.status) || order.paymentStatus === 'refunded') {
    const error = new Error('Cancelled or refunded orders cannot be shipped.');
    error.statusCode = 409;
    error.code = 'ORDER_NOT_SHIPPABLE';
    throw error;
  }
  if (order.fulfillment.pickupStatus === 'requested' && order.fulfillment.manifestStatus === 'generated') return order;

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: 'paid',
      'fulfillment.shipmentId': order.fulfillment.shipmentId,
      'fulfillment.manifestStatus': { $ne: 'generated' },
      $or: [
        { 'fulfillment.bookingStatus': { $ne: 'processing' } },
        { 'fulfillment.bookingLockedUntil': { $lte: new Date() } },
      ],
    },
    { $set: {
      'fulfillment.bookingStatus': 'processing',
      'fulfillment.bookingLockedUntil': new Date(Date.now() + 5 * 60_000),
    } },
    { new: true },
  );
  if (!claimed) {
    order = await Order.findById(order._id);
    if (order?.fulfillment?.pickupStatus === 'requested') return order;
    const error = new Error('This shipment is already being prepared. Refresh and try again shortly.');
    error.statusCode = 409;
    error.code = 'SHIPMENT_BOOKING_IN_PROGRESS';
    throw error;
  }
  order = claimed;

  try {
    // Recover provider state after a timeout between Shiprocket accepting a
    // request and our database persisting its response. This avoids assigning
    // a second AWB or scheduling the same pickup on a retry.
    const remoteShipment = await shiprocketService.getShipment(order.fulfillment.shipmentId);
    const remoteAwb = remoteShipment?.data?.awb_code || remoteShipment?.awb_code;
    const remoteCourierId = remoteShipment?.data?.courier_company_id || remoteShipment?.courier_company_id;
    const remoteCourierName = remoteShipment?.data?.courier_name || remoteShipment?.courier_name;
    if (!order.fulfillment.awbCode && remoteAwb) {
      order.fulfillment.awbCode = String(remoteAwb).slice(0, 100);
      order.fulfillment.courierId = Number(remoteCourierId) || undefined;
      order.fulfillment.courierName = String(remoteCourierName || '').slice(0, 100) || undefined;
      order.trackingNumber = order.fulfillment.awbCode;
      order.carrier = order.fulfillment.courierName;
      order.fulfillment.providerStatus = 'AWB_ASSIGNED';
      order.fulfillment.updatedAt = new Date();
      await order.save();
    }

    if (!order.fulfillment.awbCode) {
      const delivery = await shiprocketService.checkServiceability({
        deliveryPincode: order.shippingAddress?.zipCode,
        shiprocketOrderId: order.fulfillment.shiprocketOrderId,
      });
      if (!delivery.selected) {
        const error = new Error('No courier is currently available for this shipment.');
        error.statusCode = 409;
        error.code = 'NO_SHIPPING_COURIER';
        throw error;
      }
      const awbResponse = await shiprocketService.assignCourier(
        order.fulfillment.shipmentId,
        delivery.selected.courierId,
      );
      const awbCode = awbResponse?.response?.data?.awb_code
        || awbResponse?.awb_code
        || awbResponse?.response?.awb_code;
      if (!awbCode) {
        throw new shiprocketService.ShiprocketError('SHIPROCKET_AWB_RESPONSE_INVALID', 'Courier booking could not be confirmed.', 502, true);
      }
      order.fulfillment.awbCode = String(awbCode).slice(0, 100);
      order.fulfillment.courierId = delivery.selected.courierId;
      order.fulfillment.courierName = String(awbResponse?.response?.data?.courier_name || delivery.selected.name).slice(0, 100);
      order.trackingNumber = order.fulfillment.awbCode;
      order.carrier = delivery.selected.name;
      order.fulfillment.providerStatus = 'AWB_ASSIGNED';
      order.fulfillment.updatedAt = new Date();
      await order.save();
    }

    const remoteStatusCode = Number(
      remoteShipment?.data?.shipment_status_id
        || remoteShipment?.shipment_status_id
        || remoteShipment?.data?.status_code
        || remoteShipment?.status_code,
    );
    if (!order.fulfillment.pickupStatus && order.fulfillment.awbCode && [3, 4, 5, 6, 7, 17, 18, 19, 42].includes(remoteStatusCode)) {
      order.fulfillment.pickupStatus = 'requested';
      order.fulfillment.updatedAt = new Date();
      await order.save();
    }

    if (!order.fulfillment.labelUrl) {
      const labelResponse = await shiprocketService.generateLabel(order.fulfillment.shipmentId);
      const labelUrl = labelResponse?.label_url || labelResponse?.response?.label_url || labelResponse?.response?.data?.label_url;
      if (typeof labelUrl === 'string' && /^https:\/\//i.test(labelUrl)) {
        order.fulfillment.labelUrl = labelUrl;
        order.fulfillment.updatedAt = new Date();
        await order.save();
      }
    }

    if (order.fulfillment.pickupStatus !== 'requested') {
      const pickupResponse = await shiprocketService.requestPickup(order.fulfillment.shipmentId);
      const pickupAccepted = Number(pickupResponse?.pickup_status) === 1
        || Number(pickupResponse?.response?.status) === 3;
      if (!pickupAccepted) {
        throw new shiprocketService.ShiprocketError('SHIPROCKET_PICKUP_NOT_CONFIRMED', 'Pickup could not be confirmed. Review the shipment and retry.', 502, true);
      }
      order.fulfillment.pickupStatus = 'requested';
      order.fulfillment.updatedAt = new Date();
      await order.save();
    }

    if (order.fulfillment.manifestStatus !== 'generated') {
      const manifestResponse = await shiprocketService.generateManifest(order.fulfillment.shipmentId);
      const manifestUrl = manifestResponse?.manifest_url || manifestResponse?.response?.manifest_url || manifestResponse?.response?.data?.manifest_url;
      if (manifestResponse?.status === 0 || manifestResponse?.status === false || manifestResponse?.success === false) {
        throw new shiprocketService.ShiprocketError('SHIPROCKET_MANIFEST_FAILED', 'The pickup was booked, but the manifest could not be generated.', 502, true);
      }
      order.fulfillment.manifestUrl = typeof manifestUrl === 'string' && /^https:\/\//i.test(manifestUrl) ? manifestUrl : undefined;
      order.fulfillment.manifestStatus = 'generated';
    }
    order.fulfillment.bookingStatus = 'requested';
    order.fulfillment.bookingLockedUntil = undefined;
    if (!order.fulfillment.providerStatus || order.fulfillment.providerStatus === 'AWB_ASSIGNED') {
      order.fulfillment.providerStatus = 'PICKUP_REQUESTED';
    }
    order.fulfillment.updatedAt = new Date();
    order.statusHistory.push({ status: 'processing', updatedAt: new Date(), updatedBy: adminId, notes: 'Shiprocket pickup booked after packing approval' });
    if (order.status === 'confirmed') order.status = 'processing';
    await order.save();
    return order;
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $set: {
      'fulfillment.bookingStatus': 'failed',
      'fulfillment.bookingLockedUntil': null,
      'fulfillment.lastErrorCode': safeErrorCode(error),
      'fulfillment.updatedAt': new Date(),
    } });
    throw error;
  }
}

function startWorker({ intervalMs = 5_000, onError = (error) => console.error('Fulfillment worker error:', safeErrorCode(error)) } = {}) {
  let stopped = false;
  let running = false;
  let lastReconcileAt = 0;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      if (Date.now() - lastReconcileAt > 30_000) {
        lastReconcileAt = Date.now();
        const missingJobs = await Order.find({
          paymentStatus: 'paid',
          status: { $nin: ['cancelled', 'refunded'] },
          'fulfillment.shiprocketOrderId': { $exists: false },
          $or: [
            { 'fulfillment.syncStatus': { $in: ['not_ready', 'queued'] } },
            { 'fulfillment.syncStatus': { $exists: false } },
          ],
        }).select('_id').sort({ createdAt: 1 }).limit(100).lean();
        for (const order of missingJobs) await enqueuePaidOrder(order._id);
      }
      await processOneJob();
    } catch (error) { onError(error); }
    finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}

module.exports = { bookPackedOrder, enqueuePaidOrder, processOneJob, retryOrderSync, safeErrorCode, startWorker };
