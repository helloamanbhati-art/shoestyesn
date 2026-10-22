# Implementation Plan: Mobile login, backend checkout, Razorpay, and live admin

## Outcome

Deliver a production checkout in which a customer selects a product size, adds it to a backend-backed cart, authenticates with a mobile OTP before seeing the address step, saves/selects an address, pays through Razorpay, receives a backend-confirmed success state, and appears immediately in the admin with real database-derived figures.

This plan covers the current `frontend`, `backend`, and standalone `admin` applications. It removes business truth from browser storage. MongoDB and the backend become authoritative for customers, carts, addresses, orders, inventory, payments, and analytics.

## Current-state findings

- Customer authentication is email/password and returns a bearer JWT. Tokens are designed for browser-managed storage rather than secure cookie sessions.
- `Customer.phone` is not unique and only accepts ten digits; it cannot safely identify international users.
- Checkout writes address/totals to `sessionStorage`; `OrderContext` writes orders to `localStorage`.
- Order creation currently permits guest checkout, and payment verification/failure routes permit optional authentication.
- The backend already contains product, inventory, order, customer, admin, Razorpay, and payment-transaction models, so this is an integration/hardening project rather than a greenfield rebuild.
- Some admin screens already call APIs, but other screens calculate from browser order context or display hardcoded/random figures.
- Razorpay has a mock mode and real integration code. Production must fail closed when live credentials/webhook secrets are absent.

## Architecture decisions

1. **Identity key:** normalize every login number to E.164 (for example `+919876543210`) and enforce a unique database index.
2. **OTP provider adapter:** expose `sendOtp`/`verifyOtp` behind a provider interface. Select a provider with international delivery coverage before implementation.
3. **Sessions:** use short-lived access sessions and rotating refresh sessions in `HttpOnly`, `Secure`, appropriately configured `SameSite` cookies. Store only hashed refresh-session identifiers server-side. Do not put customer/admin tokens in `localStorage`.
4. **CSRF/CORS:** restrict credentialed CORS to exact storefront/admin origins and add CSRF protection to cookie-authenticated mutations. Frontend requests use `credentials: 'include'`.
5. **Backend authority:** backend reloads products/variants, verifies stock, and calculates subtotal, discount, shipping, tax, and total. Client totals are display hints only.
6. **Server cart:** authenticated carts live in MongoDB. Before login, keep selections in React memory; if reload persistence is required, store only an opaque anonymous-cart id in a cookie and keep contents server-side.
7. **Order ownership:** checkout/order/payment endpoints require customer authentication and confirm the order belongs to that customer.
8. **Payment state:** create one Razorpay order per internal payment attempt, use idempotency keys and unique gateway IDs, verify signatures with constant-time comparison, validate amount/currency/ownership, and reconcile signed webhooks.
9. **Success truth:** the UI never declares payment complete from Razorpay's browser callback alone. It shows “verifying” until the backend returns `paid`/`confirmed` or a webhook reconciles it.
10. **Admin truth:** all cards, lists, charts, counts, revenue, and customer totals come from protected, paginated backend endpoints. Revenue counts captured/paid, non-refunded amounts according to one documented rule.
11. **Auditability:** payment/order transitions, admin changes, OTP abuse events, and webhook processing have structured logs without OTPs, tokens, full addresses, or full provider payloads.

## Proposed API contract

Use `{ success, data }` for success and `{ success: false, error: { code, message, details? } }` for errors.

### Customer identity

- `POST /api/v1/auth/otp/request` — `{ phone, countryCode }`; normalize, rate-limit, send OTP, return `{ challengeId, expiresAt, retryAfter }`.
- `POST /api/v1/auth/otp/verify` — `{ challengeId, otp }`; consume once, create/find customer, create secure session cookies, return safe profile.
- `POST /api/v1/auth/session/refresh` — rotate the refresh session.
- `POST /api/v1/auth/logout` — revoke session and clear cookies.
- `GET /api/v1/auth/me` — return the authenticated customer and address summary.

### Cart and addresses

- `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/:itemId`, `DELETE /api/v1/cart/items/:itemId`.
- Cart mutations accept product/variant/size/quantity only; backend derives current price and availability.
- Retain address resources but standardize validated `GET`, `POST`, `PATCH`, and `DELETE` operations with ownership checks.

### Checkout, order, and payment

- `POST /api/v1/checkout/quote` — authoritative availability and totals for current cart/address/coupon.
- `POST /api/v1/orders` — authenticated, idempotent creation from cart and address id/snapshot.
- `POST /api/v1/orders/:orderId/payment-attempts` — authenticated and ownership-checked; creates/reuses Razorpay order.
- `POST /api/v1/payments/razorpay/verify` — authenticated and ownership-checked; verifies callback and returns current order state.
- `POST /api/v1/payments/razorpay/webhook` — signature-verified against raw request body; deduplicates event ids and updates state atomically.
- `GET /api/v1/orders/:orderId` and `GET /api/v1/orders` — authenticated customer-owned data only.

### Admin

- Keep protected, paginated `/api/v1/admin/customers`, `/orders`, `/products`, and analytics routes with filters/sorting/pagination metadata.
- Standardize a dashboard summary containing paid revenue, order counts by status, registered customers, low-stock counts, recent orders, and date range.
- Replace the `adminAuth=true` localStorage flag with backend-validated admin authentication and authorization.

## Data model and migration

- `Customer`: required unique `phoneE164`; name/email optional until checkout/profile completion; `phoneVerifiedAt`, `lastLoginAt`, status. Retire password fields only after migration policy approval.
- `OtpChallenge`: provider reference, protected normalized phone, attempt count, expiry, consumed time, abuse metadata, status, TTL cleanup.
- `Session`: subject, role, hashed refresh token id, expiry, revocation, device metadata, rotation family.
- `Cart`/`CartItem`: customer or anonymous-cart owner, product/variant/size/quantity, timestamps; no client-trusted price.
- `Order`: customer required for web checkout, immutable item/price/address snapshots, integer money in paise where migration allows, quote/version/idempotency metadata.
- `PaymentAttempt`/`PaymentTransaction`: unique Razorpay order/payment ids, transitions, paise amounts, safe provider response subset, failure/refund details.
- `WebhookEvent`: unique provider event id/hash, received/processed timestamps, result, retry metadata.
- Migration: normalize valid existing Indian numbers to `+91`, report duplicates without guessing, preserve orders, then create unique indexes.

## Delivery phases

### Phase 0 — Decisions and contracts

- Approve capability map, OTP provider, supported countries, deployment domains, migration policy, Razorpay readiness, and shipping scope.
- Define versioned schemas and login/order/payment state diagrams.
- Define paid revenue, refunds, time zone, and date-range rules used by admin.

Checkpoint: contracts and security boundaries are approved.

### Phase 1 — Customer mobile identity

- Add normalized phone migration, OTP challenges, sessions, cookie auth, rate limits, logout/refresh/me endpoints.
- Build an accessible country/mobile/OTP modal with resend, retry, error, and return-to-checkout behavior.
- Auto-create a minimal customer on first verified OTP and reuse it on future logins.

Checkpoint: the same number in two clean browsers resolves to one customer; no token/PII exists in localStorage.

### Phase 2 — Server cart and addresses

- Implement server cart APIs and migrate storefront `CartContext` to API-backed state.
- Atomically merge anonymous selections after login, cap to stock, and explain adjustments.
- Place the auth gate before address UI. After verification, fetch/save/select customer addresses.

Checkpoint: cart/addresses survive device changes after login; browser storage cannot create an order or change totals.

### Phase 3 — Authoritative checkout and orders

- Add quote service for inventory, discounts, shipping, tax, and totals.
- Create authenticated pending orders idempotently from server cart and address snapshot.
- Reserve/deduct stock using one lifecycle and release it on expiry/failure/cancellation with atomic operations.
- Replace `sessionStorage` checkout handoff and local `OrderContext` with backend APIs.

Checkpoint: concurrent tests cannot oversell; retries produce one logical order; order history is database-backed.

### Phase 4 — Production Razorpay

- Validate environment configuration and prohibit mock mode in production.
- Create attempts only for the authenticated customer's pending order and backend-calculated amount.
- Verify callback signatures/payment details and implement raw-body webhook verification, deduplication, and reconciliation.
- Add pending, failed, cancelled, timed-out, successful, refunded, and lost-callback UI states.

Checkpoint: test-mode success/failure and webhook replay pass; success only appears after backend confirmation.

### Phase 5 — Live admin

- Remove local/demo admin authentication and protect routes through backend sessions/roles.
- Connect customer, order, payment, product, stock, and dashboard pages to real admin APIs.
- Delete hardcoded revenue arrays, random sold counts, static badges, and browser-order calculations.
- Add loading, empty, retry, error, pagination, search, filters, and last-updated states.

Checkpoint: a real test customer/order/payment makes every relevant admin figure match database queries.

### Phase 6 — Security, observability, and release

- Enforce validation, exact CORS, CSRF, security headers, limits, ownership/roles, secrets, redacted logs, and safe errors.
- Add health/readiness, database/payment/OTP metrics, webhook alerts, backups, restore rehearsal, and audit review.
- Run unit, integration, contract, migration, browser E2E, accessibility, mobile, and failure-recovery tests.
- Deploy staging first, then production with a rollback/runbook and controlled live payment.

Checkpoint: one live payment reconciles across Razorpay, MongoDB, storefront history, and admin.

## Test strategy

- **Unit:** E.164 normalization, OTP rules, totals, discounts, shipping, stock, state machines, signatures.
- **Integration:** uniqueness, session rotation, cart merge, ownership, order idempotency, inventory concurrency, webhook replay.
- **Contract:** frontend/admin clients against schemas and consistent errors.
- **E2E:** product -> size -> cart -> OTP -> address -> quote -> Razorpay -> verified success -> history -> admin.
- **Abuse/security:** OTP brute force, cross-customer access, price tampering, forged webhook, CSRF, session replay, admin bypass.
- **Recovery:** lost callback, delayed/duplicate webhook, provider success plus backend timeout, failed capture, refund, stock conflict.

## Definition of done

- The same verified E.164 number opens the same account from supported countries/devices.
- Address and payment steps are unavailable until login succeeds.
- Products, stock, prices, carts, addresses, customers, orders, payments, and admin metrics are backend/database sourced.
- No auth token, profile, address, order, payment status, or admin flag is in local/session storage.
- All payable totals are calculated and revalidated by the backend.
- Razorpay completion is verified, idempotent, ownership-checked, and consistent in storefront/admin.
- Admin contains no random, hardcoded, or demo business metrics.
- Tests cover happy path, tampering, concurrency, duplicate delivery, and recovery.
- Secrets stay outside source control; backups, alerts, deployment, and rollback documentation exist.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| International OTP delivery varies | High | Select provider/country allowlist; monitor delivery; show supported-country messaging |
| Existing phone duplicates | High | Dry-run report and owner-reviewed resolution before unique index |
| Duplicate order/charge on retry | High | Stable idempotency keys, atomic unique claims, gateway uniqueness, replay-safe webhooks |
| Client price/order tampering | High | Recalculate from database and enforce ownership everywhere |
| Payment callback lost | High | Webhook reconciliation and authenticated status polling |
| Concurrent overselling | High | Atomic reservation/deduction with expiry/release |
| Cross-domain cookies fail | High | Decide URLs early and test exact CORS/credentials/SameSite in staging |
| Admin numbers disagree | Medium | One analytics service with documented refund/time-zone rules |
| PII leaks into logs | High | Allowlists, redaction, least privilege, retention/deletion policy |

## Decisions required before implementation

1. OTP provider and countries: international coverage (recommended) or India-only initially.
2. Production storefront, admin, and API URLs for cookie/CORS design.
3. Existing email/password customer link/migration policy.
4. Whether anonymous carts must survive reload; if yes, use opaque cookie + backend cart.
5. Razorpay account/KYC, keys, webhook secret, domains, refund policy, and test/live environments.
6. Supported shipping countries. Worldwide login does not mean worldwide delivery or payment availability.

## Scope exclusions unless separately approved

Cash on delivery, social login, loyalty redesign, shipping-carrier integration, invoicing/GST compliance changes, and native mobile apps.
