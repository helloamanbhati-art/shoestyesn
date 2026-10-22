const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AdminSession = require('../models/AdminSession');
const { SessionError, getCookieSettings, parseCookies } = require('./sessionService');

const ACCESS_COOKIE = 'gsh_admin_access';
const REFRESH_COOKIE = 'gsh_admin_refresh';
const hash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const duration = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

function mongoStore() {
  return {
    create: (data) => AdminSession.create(data),
    rotateCurrent: ({ tokenHash, nextTokenHash, nextExpiresAt, usedAt }) => AdminSession.findOneAndUpdate(
      { currentTokenHash: tokenHash, revokedAt: null, expiresAt: { $gt: usedAt } },
      { $set: { currentTokenHash: nextTokenHash, expiresAt: nextExpiresAt, lastUsedAt: usedAt }, $push: { previousTokenHashes: { hash: tokenHash, rotatedAt: usedAt } } },
      { new: true },
    ),
    findByPreviousToken: (tokenHash, at) => AdminSession.findOne({ 'previousTokenHashes.hash': tokenHash, expiresAt: { $gt: at } }),
    revokeById: (id, revokedAt, reason) => AdminSession.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt, revocationReason: reason } }),
    revokeByToken: (tokenHash, revokedAt, reason) => AdminSession.updateOne(
      { revokedAt: null, $or: [{ currentTokenHash: tokenHash }, { 'previousTokenHashes.hash': tokenHash }] },
      { $set: { revokedAt, revocationReason: reason } },
    ),
    findActiveById: (id, adminId, at) => AdminSession.findOne({ _id: id, adminId, revokedAt: null, expiresAt: { $gt: at } }),
  };
}

function createAdminSessionService({
  store = mongoStore(), env = process.env, clock = () => new Date(),
  createRefreshToken = () => crypto.randomBytes(48).toString('base64url'),
} = {}) {
  const secret = env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new SessionError('SESSION_CONFIGURATION_ERROR', 'Admin authentication is not configured', 503);
  }
  const accessTtl = duration(env.ADMIN_ACCESS_TTL_MS, 15 * 60 * 1000);
  const refreshTtl = duration(env.ADMIN_REFRESH_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  const sign = (adminId, sessionId) => jwt.sign(
    { sub: String(adminId), sid: String(sessionId), role: 'admin' },
    secret,
    { expiresIn: Math.floor(accessTtl / 1000) },
  );

  async function createSession(adminId) {
    const now = clock();
    const refreshToken = createRefreshToken();
    const session = await store.create({
      adminId, familyId: crypto.randomUUID(), currentTokenHash: hash(refreshToken),
      previousTokenHashes: [], expiresAt: new Date(now.getTime() + refreshTtl), createdAt: now,
    });
    return { accessToken: sign(adminId, session._id), refreshToken, refreshExpiresAt: session.expiresAt };
  }

  async function rotateSession(refreshToken) {
    if (!refreshToken) throw new SessionError('REFRESH_TOKEN_REQUIRED');
    const now = clock();
    const tokenHash = hash(refreshToken);
    const next = createRefreshToken();
    const nextExpiresAt = new Date(now.getTime() + refreshTtl);
    const session = await store.rotateCurrent({ tokenHash, nextTokenHash: hash(next), nextExpiresAt, usedAt: now });
    if (!session) {
      const replayed = await store.findByPreviousToken(tokenHash, now);
      if (replayed) await store.revokeById(replayed._id, now, 'refresh_token_reuse');
      throw new SessionError(replayed ? 'REFRESH_TOKEN_REUSED' : 'REFRESH_TOKEN_INVALID');
    }
    return { accessToken: sign(session.adminId, session._id), refreshToken: next, refreshExpiresAt: session.expiresAt, adminId: String(session.adminId) };
  }

  async function verifyAccessToken(token) {
    let claims;
    try { claims = jwt.verify(token, secret); } catch { throw new SessionError('ACCESS_TOKEN_INVALID'); }
    if (claims.role !== 'admin' || !claims.sub || !claims.sid) throw new SessionError('ACCESS_TOKEN_INVALID');
    if (!await store.findActiveById(claims.sid, claims.sub, clock())) throw new SessionError('SESSION_REVOKED');
    return claims;
  }

  async function revokeSession(refreshToken) {
    if (refreshToken) await store.revokeByToken(hash(refreshToken), clock(), 'logout');
  }
  return { createSession, rotateSession, verifyAccessToken, revokeSession };
}

function cookieOptions(env = process.env) {
  const settings = getCookieSettings(env);
  return { httpOnly: true, secure: settings.secure, sameSite: settings.sameSite, ...(settings.domain && { domain: settings.domain }) };
}

function setAdminCookies(res, session, env = process.env) {
  const common = cookieOptions(env);
  res.cookie(ACCESS_COOKIE, session.accessToken, { ...common, path: '/api/v1/admin', maxAge: duration(env.ADMIN_ACCESS_TTL_MS, 15 * 60 * 1000) });
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...common, path: '/api/v1/admin/auth', maxAge: duration(env.ADMIN_REFRESH_TTL_MS, 30 * 24 * 60 * 60 * 1000) });
}

function clearAdminCookies(res, env = process.env) {
  const common = cookieOptions(env);
  res.clearCookie(ACCESS_COOKIE, { ...common, path: '/api/v1/admin' });
  res.clearCookie(REFRESH_COOKIE, { ...common, path: '/api/v1/admin/auth' });
}

function getAdminTokens(req) {
  const cookies = parseCookies(req.headers?.cookie || '');
  return {
    accessToken: cookies[ACCESS_COOKIE] || null,
    refreshToken: cookies[REFRESH_COOKIE] || null,
  };
}

module.exports = { ACCESS_COOKIE, REFRESH_COOKIE, clearAdminCookies, createAdminSessionService, getAdminTokens, setAdminCookies };
