const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AuthSession = require("../models/AuthSession");

const ACCESS_COOKIE = "gsh_access";
const REFRESH_COOKIE = "gsh_refresh";

class SessionError extends Error {
  constructor(code, message = "Authentication is required", statusCode = 401) {
    super(message);
    this.name = "SessionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function getAccessSecret(env = process.env) {
  const secret = env.JWT_ACCESS_SECRET;
  if (env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new SessionError(
      "SESSION_CONFIGURATION_ERROR",
      "Authentication is not configured",
      503
    );
  }
  return secret || "dev-access-secret-change-me";
}

function positiveDuration(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createMongoSessionStore() {
  return {
    async create(data) {
      return AuthSession.create(data);
    },
    async rotateCurrent({ tokenHash, nextTokenHash, usedAt }) {
      return AuthSession.findOneAndUpdate(
        {
          currentTokenHash: tokenHash,
          revokedAt: null,
          expiresAt: { $gt: usedAt },
        },
        {
          $set: { currentTokenHash: nextTokenHash, lastUsedAt: usedAt },
          $push: { previousTokenHashes: { hash: tokenHash, rotatedAt: usedAt } },
        },
        { new: true }
      );
    },
    async findByPreviousToken(tokenHash, at) {
      return AuthSession.findOne({
        "previousTokenHashes.hash": tokenHash,
        expiresAt: { $gt: at },
      });
    },
    async revokeById(id, revokedAt, reason) {
      await AuthSession.updateOne(
        { _id: id, revokedAt: null },
        { $set: { revokedAt, revocationReason: reason } }
      );
    },
    async revokeByToken(tokenHash, revokedAt, reason) {
      await AuthSession.updateOne(
        {
          revokedAt: null,
          $or: [
            { currentTokenHash: tokenHash },
            { "previousTokenHashes.hash": tokenHash },
          ],
        },
        { $set: { revokedAt, revocationReason: reason } }
      );
    },
    async findActiveById(id, customerId, at) {
      return AuthSession.findOne({
        _id: id,
        customerId,
        revokedAt: null,
        expiresAt: { $gt: at },
      });
    },
  };
}

function createSessionService({
  store = createMongoSessionStore(),
  env = process.env,
  clock = () => new Date(),
  createRefreshToken = () => crypto.randomBytes(48).toString("base64url"),
  createFamilyId = () => crypto.randomUUID(),
} = {}) {
  const accessTtlMs = positiveDuration(env.AUTH_ACCESS_TTL_MS, 15 * 60 * 1000);
  const refreshTtlMs = positiveDuration(env.AUTH_REFRESH_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  const accessSecret = getAccessSecret(env);

  function signAccessToken(customerId, sessionId) {
    return jwt.sign(
      { sub: String(customerId), sid: String(sessionId), role: "customer" },
      accessSecret,
      { expiresIn: Math.floor(accessTtlMs / 1000) }
    );
  }

  async function createCustomerSession(customerId) {
    const createdAt = clock();
    const refreshToken = createRefreshToken();
    const session = await store.create({
      customerId,
      role: "customer",
      familyId: createFamilyId(),
      currentTokenHash: hashRefreshToken(refreshToken),
      previousTokenHashes: [],
      expiresAt: new Date(createdAt.getTime() + refreshTtlMs),
      createdAt,
    });

    return {
      accessToken: signAccessToken(customerId, session._id),
      refreshToken,
      refreshExpiresAt: session.expiresAt,
      customerId: String(customerId),
      sessionId: String(session._id),
    };
  }

  async function rotateCustomerSession(refreshToken) {
    if (!refreshToken) {
      throw new SessionError("REFRESH_TOKEN_REQUIRED");
    }

    const usedAt = clock();
    const tokenHash = hashRefreshToken(refreshToken);
    const nextRefreshToken = createRefreshToken();
    const session = await store.rotateCurrent({
      tokenHash,
      nextTokenHash: hashRefreshToken(nextRefreshToken),
      usedAt,
    });

    if (!session) {
      const replayed = await store.findByPreviousToken(tokenHash, usedAt);
      if (replayed) {
        await store.revokeById(
          replayed._id,
          usedAt,
          "refresh_token_reuse"
        );
        throw new SessionError(
          "REFRESH_TOKEN_REUSED",
          "This session has been revoked"
        );
      }
      throw new SessionError("REFRESH_TOKEN_INVALID");
    }

    return {
      accessToken: signAccessToken(session.customerId, session._id),
      refreshToken: nextRefreshToken,
      refreshExpiresAt: session.expiresAt,
      customerId: String(session.customerId),
      sessionId: String(session._id),
    };
  }

  async function revokeCustomerSession(refreshToken) {
    if (!refreshToken) return;
    await store.revokeByToken(
      hashRefreshToken(refreshToken),
      clock(),
      "logout"
    );
  }

  async function verifyCustomerAccessToken(accessToken) {
    let claims;
    try {
      claims = jwt.verify(accessToken, accessSecret);
    } catch (_error) {
      throw new SessionError("ACCESS_TOKEN_INVALID");
    }
    if (claims.role !== "customer" || !claims.sub || !claims.sid) {
      throw new SessionError("ACCESS_TOKEN_INVALID");
    }
    const active = await store.findActiveById(claims.sid, claims.sub, clock());
    if (!active) throw new SessionError("SESSION_REVOKED");
    return claims;
  }

  return {
    createCustomerSession,
    revokeCustomerSession,
    rotateCustomerSession,
    verifyCustomerAccessToken,
  };
}

function getCookieSettings(env = process.env) {
  // The deployed storefront and API normally live on separate Render hosts.
  // Those are cross-site requests, so production cookies must be explicitly
  // eligible for credentialed fetches. Local development stays Lax.
  const defaultSameSite = env.NODE_ENV === "production" ? "none" : "lax";
  const sameSite = (env.AUTH_COOKIE_SAME_SITE || defaultSameSite).toLowerCase();
  const secure = env.AUTH_COOKIE_SECURE
    ? env.AUTH_COOKIE_SECURE === "true"
    : env.NODE_ENV === "production";
  if (!["lax", "strict", "none"].includes(sameSite) || (sameSite === "none" && !secure)) {
    throw new SessionError(
      "SESSION_CONFIGURATION_ERROR",
      "Authentication is not configured",
      503
    );
  }
  return { sameSite, secure, domain: env.AUTH_COOKIE_DOMAIN || undefined };
}

function setSessionCookies(res, session, env = process.env) {
  const settings = getCookieSettings(env);
  const accessMaxAge = positiveDuration(env.AUTH_ACCESS_TTL_MS, 15 * 60 * 1000);
  const refreshMaxAge = positiveDuration(
    env.AUTH_REFRESH_TTL_MS,
    30 * 24 * 60 * 60 * 1000
  );
  const common = {
    httpOnly: true,
    secure: settings.secure,
    sameSite: settings.sameSite,
    ...(settings.domain && { domain: settings.domain }),
  };

  res.cookie(ACCESS_COOKIE, session.accessToken, {
    ...common,
    path: "/",
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...common,
    path: "/api/v1/auth",
    maxAge: refreshMaxAge,
  });
}

function clearSessionCookies(res, env = process.env) {
  const settings = getCookieSettings(env);
  const common = {
    httpOnly: true,
    secure: settings.secure,
    sameSite: settings.sameSite,
    ...(settings.domain && { domain: settings.domain }),
  };
  res.clearCookie(ACCESS_COOKIE, { ...common, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...common, path: "/api/v1/auth" });
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, entry) => {
    const separator = entry.indexOf("=");
    if (separator < 1) return cookies;
    const name = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch (_error) {
      cookies[name] = value;
    }
    return cookies;
  }, {});
}

function getRequestTokens(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const authorization = req.headers?.authorization || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  return {
    accessToken: cookies[ACCESS_COOKIE] || bearer,
    refreshToken: cookies[REFRESH_COOKIE] || null,
    usedAccessCookie: Boolean(cookies[ACCESS_COOKIE]),
  };
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SessionError,
  clearSessionCookies,
  createMongoSessionStore,
  createSessionService,
  getAccessSecret,
  getCookieSettings,
  getRequestTokens,
  hashRefreshToken,
  parseCookies,
  setSessionCookies,
};
