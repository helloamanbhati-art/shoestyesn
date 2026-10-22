const Order = require("../models/Order");
const PaymentTransaction = require("../models/PaymentTransaction");
const paymentService = require("../services/paymentService");
const emailService = require("../services/emailService");
const Customer = require("../models/Customer");
const crypto = require("crypto");
const WebhookEvent = require("../models/WebhookEvent");
const { canAccessOrder } = require('../services/guestOrderAccessService');

async function findAccessibleOrder(req, orderId, populateCustomer = false) {
  let query = Order.findById(orderId).select('+guestAccessTokenHash');
  if (populateCustomer) query = query.populate('customer');
  const order = await query;
  return order && canAccessOrder(order, req.customer, req.get('X-Guest-Order-Token')) ? order : null;
}

exports.getPaymentConfig = (_req, res) => {
  res.json({
    success: true,
    data: paymentService.getPublicPaymentConfig(),
  });
};

// Create Razorpay order
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await findAccessibleOrder(req, orderId, true);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentDetails?.razorpayOrderId) {
      return res.json({
        success: true,
        data: {
          razorpayOrderId: order.paymentDetails.razorpayOrderId,
          amount: Math.round(order.total * 100),
          currency: "INR",
          orderId: order._id,
        },
      });
    }

    const razorpayOrder = await paymentService.createRazorpayOrder(order);

    // Update order with Razorpay order ID
    order.paymentDetails.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: order._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Load order before verification so we can validate the exact amount.
    const order = await findAccessibleOrder(req, orderId, true);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentDetails?.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        error: { code: "PAYMENT_ORDER_MISMATCH", message: "Payment order does not match checkout" },
      });
    }

    // Verify payment signature
    const verificationResult = await paymentService.verifyPayment({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      expectedAmount: order.total,
    });

    if (!verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    order.paymentStatus = "paid";
    order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
    order.paymentDetails.razorpaySignature = razorpaySignature;
    order.paymentDetails.transactionId = razorpayPaymentId;
    order.paymentDetails.paidAmount = order.total;
    order.paymentDetails.paidAt = new Date();

    // Change order status to confirmed
    if (order.status === "pending") {
      order.status = "confirmed";
      order.statusHistory.push({
        status: "confirmed",
        updatedAt: new Date(),
        notes: "Payment received",
      });
    }

    await order.save();

    // Record transaction
    await paymentService.recordPaymentTransaction({
      order: orderId,
      customer: order.customer?._id,
      amount: order.total,
      currency: "INR",
      paymentMethod: "razorpay",
      transactionId: razorpayPaymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: "success",
      paymentGatewayResponse: verificationResult.payment,
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        paymentId: razorpayPaymentId,
        paidAt: order.paymentDetails.paidAt,
      },
    });

    // Payment is already durable at this point. Email delivery is useful but
    // must not keep the customer staring at a payment-processing screen.
    if (order.customer && order.customer.email) {
      setImmediate(() => {
        void emailService.sendPaymentReceivedEmail(order, order.customer).catch((emailError) => {
          console.error("Payment confirmation email failed:", emailError.message);
        });
      });
    }
  } catch (error) {
    next(error);
  }
};

// Handle payment failure
exports.handlePaymentFailure = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, failureReason } = req.body;

    const order = await findAccessibleOrder(req, orderId);

    if (order) {
      // Browser failure callbacks are informational only. Webhooks or verified
      // gateway status are the authority for the order's payment status.
      await paymentService.recordPaymentTransaction({
        order: orderId,
        customer: order.customer,
        amount: order.total,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId,
        status: "failed",
        failureReason,
      });
    }

    res.json({
      success: true,
      message: "Payment failure recorded",
    });
  } catch (error) {
    next(error);
  }
};

// Request refund
exports.requestRefund = async (req, res, next) => {
  try {
    const { orderId, refundAmount, refundReason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      customer: req.customer._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Refund can only be processed for paid orders",
      });
    }

    order.refundStatus = "requested";
    const requestedAmount = Number(refundAmount || order.total);
    if (requestedAmount <= 0 || requestedAmount > order.total) {
      return res.status(400).json({ success: false, message: "Invalid refund amount" });
    }
    order.refundAmount = requestedAmount;
    order.refundReason = refundReason;
    order.refundRequestDate = new Date();

    await order.save();

    res.json({
      success: true,
      message: "Refund request submitted",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Process refund (admin only)
exports.processRefund = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { refundAmount } = req.body;

    const order = await Order.findById(orderId);

    if (!order || !order.paymentDetails.razorpayPaymentId) {
      return res.status(404).json({
        success: false,
        message: "Order not found or payment not processed",
      });
    }

    // Process refund via Razorpay
    const refund = await paymentService.refundPayment(
      order.paymentDetails.razorpayPaymentId,
      refundAmount
    );

    order.refundStatus = "processed";
    order.refundProcessedDate = new Date();
    order.status = "refunded";
    order.statusHistory.push({
      status: "refunded",
      updatedAt: new Date(),
      notes: `Refund of ₹${refundAmount} processed`,
    });

    await order.save();

    // Record refund transaction
    await PaymentTransaction.create({
      order: orderId,
      amount: refundAmount,
      currency: "INR",
      paymentMethod: "razorpay",
      status: "refunded",
      refundId: refund.id,
      refundDate: new Date(),
    });

    res.json({
      success: true,
      message: "Refund processed successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Get payment transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const ownsOrder = await Order.exists({
      _id: orderId,
      customer: req.customer._id,
    });
    if (!ownsOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const transactions = await PaymentTransaction.find({
      order: orderId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// Razorpay webhook
exports.handleRazorpayWebhook = async (req, res, next) => {
  let webhookEventId = null;
  try {
    const signature = req.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: "PAYMENT_WEBHOOK_NOT_CONFIGURED",
          message: "Payment webhook is not configured",
        },
      });
    }

    if (!paymentService.verifyRazorpayWebhookSignature(
      req.rawBody,
      signature,
      webhookSecret
    )) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_WEBHOOK_SIGNATURE",
          message: "Invalid payment webhook signature",
        },
      });
    }

    const payloadHash = crypto
      .createHash("sha256")
      .update(req.rawBody)
      .digest("hex");
    webhookEventId = req.get("x-razorpay-event-id") || payloadHash;

    try {
      await WebhookEvent.create({
        provider: "razorpay",
        eventId: webhookEventId,
        eventType: req.body.event || "unknown",
        payloadHash,
        status: "processing",
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;

      const claimedRetry = await WebhookEvent.findOneAndUpdate(
        { provider: "razorpay", eventId: webhookEventId, status: "failed" },
        { $set: { status: "processing", lastError: null } },
        { new: true }
      );
      if (!claimedRetry) {
        return res.status(200).json({ success: true, duplicate: true });
      }
    }

    const { event, payload } = req.body;

    await paymentService.handleRazorpayWebhook({ event, payload });

    await WebhookEvent.updateOne(
      { provider: "razorpay", eventId: webhookEventId },
      {
        $set: {
          status: "processed",
          processedAt: new Date(),
          lastError: null,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    if (webhookEventId) {
      await WebhookEvent.updateOne(
        { provider: "razorpay", eventId: webhookEventId },
        { $set: { status: "failed", lastError: error.message } }
      ).catch(() => undefined);
    }
    next(error);
  }
};
