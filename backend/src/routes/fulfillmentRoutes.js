const express = require('express');
const webhookController = require('../controllers/shiprocketWebhookController');
const { shiprocketWebhookLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.post('/fulfillment', shiprocketWebhookLimiter, webhookController.handleWebhook);

module.exports = router;
