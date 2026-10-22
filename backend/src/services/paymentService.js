const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const PaymentTransaction = require("../models/PaymentTransaction");
const { AppError } = require("../middleware/errorHandler");

const mockPaymentsEnabled = () =>
  process.env.RAZORPAY_MOCK_MODE === "true" && process.env.NODE_ENV !== "production";

exports.getPublicPaymentConfig = () => ({
  keyId: process.env.RAZORPAY_KEY_ID || "",
  mockMode: mockPaymentsEnabled(),
});

exports.verifyRazorpayWebhookSignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const receivedBuffer = Buffer.from(String(signature), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Create Razorpay order
exports.createRazorpayOrder = async (orderData) => {
  try {
    // Test mode - return mock order without calling Razorpay API
    if (mockPaymentsEnabled()) {
      console.log('✓ Razorpay TEST MODE enabled - returning mock order');
      return {
        id: `order_test_${Date.now()}`,
        entity: 'order',
        amount: Math.round(orderData.total * 100),
        amount_paid: 0,
        amount_due: Math.round(orderData.total * 100),
        currency: 'INR',
        receipt: `order_${orderData.orderNumber}`,
        offer_id: null,
        status: 'created',
        attempts: 0,
        notes: {
          orderId: orderData._id.toString(),
          orderNumber: orderData.orderNumber,
        },
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      throw new Error("Razorpay not configured. Please check environment variables or enable RAZORPAY_MOCK_MODE for local UI-only testing.");
    }

    const options = {
      amount: Math.round(orderData.total * 100), // Amount in paise
      currency: "INR",
      receipt: `order_${orderData.orderNumber}`,
      description: "GUJJUS STYLE HUB Order",
      notes: {
        orderId: orderData._id.toString(),
        orderNumber: orderData.orderNumber,
      },
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw new AppError(
      "Secure payment is temporarily unavailable. Your cart is safe; please try again shortly.",
      503,
      "PAYMENT_GATEWAY_UNAVAILABLE"
    );
  }
};

// Verify payment
exports.verifyPayment = async (paymentData) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      expectedAmount,
    } = paymentData;

    // Test mode - accept all payments as valid
    if (mockPaymentsEnabled()) {
      console.log('✓ Razorpay TEST MODE enabled - accepting payment as valid');
      return {
        isValid: true,
        payment: {
          id: razorpay_payment_id,
          entity: 'payment',
          amount: 0,
          currency: 'INR',
          status: 'captured',
          method: 'card',
          description: 'Test payment',
          amount_refunded: 0,
          refund_status: null,
          captured: true,
          order_id: razorpay_order_id,
          invoice_id: null,
          international: false,
          method: 'card',
          amount_paise: 0,
          email: 'test@example.com',
          contact: '+919999999999',
          fee: 0,
          tax: 0,
          error_code: null,
          error_description: null,
          error_source: null,
          error_step: null,
          error_reason: null,
          error_field: null,
          error_http_status: null,
          acquirer_data: {
            auth_code: 'TEST_AUTH',
          },
          notes: {},
          fee_details: null,
          created_at: Math.floor(Date.now() / 1000),
        },
      };
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      throw new AppError(
        "Secure payment verification is temporarily unavailable.",
        503,
        "PAYMENT_GATEWAY_UNAVAILABLE"
      );
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(String(razorpay_signature || ""), "utf8");
    const isSignatureValid = expectedBuffer.length === receivedBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isSignatureValid) {
      throw new AppError(
        "Payment verification failed.",
        400,
        "PAYMENT_SIGNATURE_INVALID"
      );
    }

    // Fetch payment details from Razorpay after signature verification
    let payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.order_id !== razorpay_order_id) {
      throw new AppError("Payment verification failed.", 400, "PAYMENT_ORDER_MISMATCH");
    }

    if (
      typeof expectedAmount === "number" &&
      payment.amount !== Math.round(expectedAmount * 100)
    ) {
      throw new AppError("Payment verification failed.", 400, "PAYMENT_AMOUNT_MISMATCH");
    }

    if (payment.status === "failed") {
      throw new AppError("Payment was not successful.", 400, "PAYMENT_FAILED");
    }

    if (payment.status === "refunded") {
      throw new AppError("Payment has already been refunded.", 409, "PAYMENT_REFUNDED");
    }

    // Auto-capture fallback for late/manual capture cases.
    if (payment.status === "authorized" && payment.captured === false) {
      const captureAmount =
        typeof expectedAmount === "number"
          ? Math.round(expectedAmount * 100)
          : payment.amount;

      payment = await razorpay.payments.capture(
        razorpay_payment_id,
        captureAmount,
        payment.currency || "INR"
      );
    }

    if (!["captured", "authorized"].includes(payment.status)) {
      throw new AppError("Payment is still pending confirmation.", 409, "PAYMENT_PENDING");
    }

    return {
      isValid: true,
      payment,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Razorpay payment verification error:", error);
    throw new AppError(
      "Secure payment verification is temporarily unavailable.",
      503,
      "PAYMENT_GATEWAY_UNAVAILABLE"
    );
  }
};

// Get payment status
exports.getPaymentStatus = async (paymentId) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      throw new Error("Razorpay not configured.");
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

// Refund payment
exports.refundPayment = async (paymentId, amount) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      throw new Error("Razorpay not configured.");
    }

    const options = {
      amount: amount ? Math.round(amount * 100) : undefined, // Partial refund
      speed: "optimum",
      receipt: `refund_${Date.now()}`,
      notes: {
        reason: "Customer return",
        processedAt: new Date().toISOString(),
      },
    };

    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    throw new Error(`Refund failed: ${error.message}`);
  }
};

// Record payment transaction
exports.recordPaymentTransaction = async (transactionData) => {
  try {
    if (transactionData.razorpayPaymentId) {
      return PaymentTransaction.findOneAndUpdate(
        { razorpayPaymentId: transactionData.razorpayPaymentId },
        { $setOnInsert: transactionData },
        { new: true, upsert: true, runValidators: true }
      );
    }
    return PaymentTransaction.create(transactionData);
  } catch (error) {
    throw new Error(`Failed to record transaction: ${error.message}`);
  }
};

// Update order payment status
exports.updateOrderPaymentStatus = async (orderId, paymentStatus, paymentData) => {
  try {
    const query = { _id: orderId };
    if (paymentStatus === "failed") {
      query.paymentStatus = { $nin: ["paid", "refunded"] };
    }
    const update = {
      paymentStatus,
      "paymentDetails.razorpayPaymentId": paymentData.razorpayPaymentId,
      "paymentDetails.transactionId": paymentData.razorpayPaymentId,
      "paymentDetails.paidAmount": paymentData.paidAmount,
    };
    if (paymentStatus === "paid") {
      update.status = "confirmed";
      update["paymentDetails.paidAt"] = new Date();
    }
    const updateDocument = { $set: update };
    if (paymentStatus === "paid") {
      updateDocument.$push = {
        statusHistory: {
          status: "confirmed",
          updatedAt: new Date(),
          notes: "Payment confirmed by Razorpay webhook",
        },
      };
    }
    const order = await Order.findOneAndUpdate(
      query,
      updateDocument,
      { new: true }
    );

    return order;
  } catch (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
};

// Handle webhook
exports.handleRazorpayWebhook = async (event) => {
  try {
    const { event: eventType, payload } = event;

    switch (eventType) {
      case "payment.authorized":
        // Payment authorized
        break;

      case "payment.failed":
        // Payment failed
        const failedPaymentData = payload.payment.entity;
        await exports.updateOrderPaymentStatus(
          failedPaymentData.notes.orderId,
          "failed",
          {
            razorpayPaymentId: failedPaymentData.id,
            paidAmount: 0,
          }
        );
        break;

      case "order.paid":
        // Order paid
        const paidOrderData = payload.order.entity;
        const paidPaymentData = payload.payment.entity;
        await exports.updateOrderPaymentStatus(paidOrderData.notes.orderId, "paid", {
          razorpayPaymentId: paidPaymentData.id,
          paidAmount: paidPaymentData.amount / 100,
        });
        break;

      case "refund.created":
        // Refund initiated
        break;

      case "refund.failed":
        // Refund failed
        break;

      default:
        console.log(`Unknown event: ${eventType}`);
    }

    return { success: true };
  } catch (error) {
    throw new Error(`Webhook handling failed: ${error.message}`);
  }
};
