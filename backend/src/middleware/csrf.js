const { parseCookies, ACCESS_COOKIE, REFRESH_COOKIE } = require('../services/sessionService');
const {
  ACCESS_COOKIE: ADMIN_ACCESS_COOKIE,
  REFRESH_COOKIE: ADMIN_REFRESH_COOKIE,
} = require('../services/adminSessionService');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SHOE_STYLE_PRODUCTION_ORIGINS = [
  'https://sarojinishoestyle.com',
  'https://www.sarojinishoestyle.com',
  'https://admin.sarojinishoestyle.com',
];

function getAllowedOrigins(env = process.env) {
  const configured = [
    ...(env.ALLOWED_ORIGINS || '').split(','),
    env.FRONTEND_URL,
    env.ADMIN_URL,
  ].filter(Boolean).map((origin) => origin.trim().replace(/\/$/, ''));

  if (env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://localhost:5174');
  } else {
    configured.push(...SHOE_STYLE_PRODUCTION_ORIGINS);
  }
  return [...new Set(configured)];
}

function validateProductionAdminOrigin(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const adminUrl = String(env.ADMIN_URL || '').trim().replace(/\/$/, '');
  if (!adminUrl) throw new Error('ADMIN_URL is required in production');

  let parsed;
  try { parsed = new URL(adminUrl); } catch { throw new Error('ADMIN_URL must be a valid HTTPS URL'); }
  if (parsed.protocol !== 'https:') throw new Error('ADMIN_URL must use HTTPS in production');
}

function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.originalUrl === '/api/v1/payments/webhook/razorpay') {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const hasSessionCookie = Boolean(
    cookies[ACCESS_COOKIE]
    || cookies[REFRESH_COOKIE]
    || cookies[ADMIN_ACCESS_COOKIE]
    || cookies[ADMIN_REFRESH_COOKIE]
  );
  if (!hasSessionCookie) return next();

  const origin = (req.get('origin') || '').replace(/\/$/, '');
  if (!origin || !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({
      success: false,
      error: { code: 'UNTRUSTED_ORIGIN', message: 'Request origin is not allowed' },
    });
  }
  return next();
}

module.exports = { getAllowedOrigins, requireTrustedOrigin, validateProductionAdminOrigin };
