const Razorpay = require("razorpay");
require("dotenv").config();

const paymentService = require("../src/services/paymentService");

async function main() {
  const configuration = paymentService.validateRazorpayConfiguration();

  if (configuration.mode !== "test") {
    throw new Error("This command only runs with Razorpay test-mode credentials.");
  }

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn("WARNING: RAZORPAY_WEBHOOK_SECRET is missing; webhook recovery cannot be tested yet.");
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  const order = await razorpay.orders.create({
    amount: 100,
    currency: "INR",
    receipt: `preflight_${Date.now()}`,
    notes: { purpose: "test_credentials_preflight" },
  });

  console.log(JSON.stringify({
    ok: true,
    mode: configuration.mode,
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
  }, null, 2));
}

main().catch((error) => {
  const message = error?.error?.description || error?.message || "Razorpay preflight failed";
  console.error(`Razorpay test preflight failed: ${message}`);
  process.exitCode = 1;
});
