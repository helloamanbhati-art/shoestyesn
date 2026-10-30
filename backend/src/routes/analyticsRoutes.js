const express = require('express');
const DailyVisitor = require('../models/DailyVisitor');
const { recordVisit } = require('../services/visitorAnalyticsService');

const router = express.Router();
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

router.post('/visit', async (req, res, next) => {
  try {
    const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim() : '';
    if (!VISITOR_ID_PATTERN.test(visitorId) || visitorId.length > 64) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VISITOR_ID', message: 'A valid anonymous visitor ID is required' },
      });
    }
    await recordVisit(DailyVisitor, visitorId);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
