const Order = require('../models/Order');
const fulfillmentService = require('../services/shiprocketFulfillmentService');
const { canAccessOrder } = require('../services/guestOrderAccessService');

function sendSafeError(error, res, next) {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ success: false, error: { code: error.code || 'FULFILLMENT_ERROR', message: error.message } });
  }
  return next(error);
}

exports.retrySync = async (req, res, next) => {
  try {
    const order = await fulfillmentService.retryOrderSync(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    return res.json({ success: true, data: { orderId: order._id, fulfillment: order.fulfillment } });
  } catch (error) {
    return sendSafeError(error, res, next);
  }
};

exports.bookPackedOrder = async (req, res, next) => {
  try {
    const order = await fulfillmentService.bookPackedOrder(req.params.orderId, req.admin._id);
    return res.json({ success: true, data: { orderId: order._id, status: order.status, fulfillment: order.fulfillment } });
  } catch (error) {
    return sendSafeError(error, res, next);
  }
};

exports.getCustomerTracking = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId).select('+guestAccessTokenHash customer status fulfillment.awbCode fulfillment.courierName fulfillment.providerStatus fulfillment.lastTrackingAt fulfillment.estimatedDeliveryAt');
    if (!order || !canAccessOrder(order, req.customer, req.get('X-Guest-Order-Token'))) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    }
    return res.json({ success: true, data: {
      status: order.status,
      trackingNumber: order.fulfillment?.awbCode || null,
      carrier: order.fulfillment?.courierName || null,
      providerStatus: order.fulfillment?.providerStatus || null,
      lastUpdatedAt: order.fulfillment?.lastTrackingAt || null,
      estimatedDeliveryAt: order.fulfillment?.estimatedDeliveryAt || null,
    } });
  } catch (error) {
    return next(error);
  }
};
