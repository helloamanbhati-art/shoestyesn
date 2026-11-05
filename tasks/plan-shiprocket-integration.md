# Implementation Plan: Shiprocket Delivery and Fulfillment

## Outcome

Keep the existing storefront checkout, backend order records, admin, and Razorpay payment flow. Add Shiprocket as a server-to-server delivery availability and fulfillment provider. Customers can check a destination PIN code early in checkout. The backend rechecks serviceability when the final address is submitted, then sends a paid order to Shiprocket and keeps shipment/tracking state synchronized with the local order.

## Scope and current state

- Checkout already gets a backend quote, creates a local order, and creates a Razorpay order. Razorpay callback verification and webhook handling can both mark an order paid.
- `backend/src/services/checkoutService.js` currently returns zero shipping cost.
- `Order` stores address and generic tracking fields, but has no Shiprocket identifiers or shipment lifecycle.
- Admin order pages exist; payment success is already the source for confirmed order state.
- The backend loads root `.env.local` and dotenv defaults. The inspected `.env.local` did not contain `SHIPROCKET_EMAIL` or `SHIPROCKET_PASSWORD`; deployment environment variables and other secrets were not inspected. Do not print secret values during future checks.
- Shiprocket's documented API supports courier serviceability by pickup/delivery PIN code, rates and delivery estimates; order creation; AWB assignment; pickup requests; tracking; and webhooks. These are separate shipping APIs, not the hosted Shiprocket Checkout product.

## User experience and fulfillment policy

1. Add a six-digit PIN-code availability check before the full address form. Require a valid cart or Buy Now selection so the server can derive shipment weight and payment mode.
2. Show available/not available, courier ETA range, and any shipping price only when the API returns usable values. Treat this as an estimate, not a delivery guarantee.
3. Recheck availability on the server when quoting/submitting the final address. The client cannot provide a courier, freight amount, product weight, or final payable total as authority.
4. Keep the existing Razorpay payment UI and local order database. A successful browser callback alone never triggers fulfillment; only verified payment state does.
5. Once an order is paid, automatically create (or idempotently reconcile) the corresponding Shiprocket order. This puts paid orders into the Shiprocket dashboard and the local admin.
6. Do not assign an AWB or book a pickup until an authorized admin marks the package ready to ship. That action assigns a courier and requests pickup; store the returned AWB, courier, label URL, and state. This prevents a payment from dispatching a parcel before it is packed. If the business wants no admin packing step, this policy can later be changed to automatic booking after payment.
7. Receive Shiprocket tracking webhooks and update delivery status in the local admin and customer order tracking view.

## Trust boundaries and security requirements

- Shiprocket credentials, bearer token, Razorpay secret, and webhook secret remain backend-only. Store production secrets in the backend host's secret manager; local values belong in ignored `.env.local`. Never use a frontend `VITE_`/`NEXT_PUBLIC_` variable for secrets.
- Authenticate to Shiprocket with the configured API-user email/password only in the backend. Cache the bearer token in process memory until shortly before expiry; refresh on expiry/401 once, with a timeout and bounded retries. Never persist or log the token or credentials.
- Add a dedicated Shiprocket client with a fixed HTTPS base URL, strict response timeouts, response-shape validation, safe error mapping, and redacted structured logs. Do not allow client-provided URLs or arbitrary provider endpoints.
- Apply strict schemas, payload size caps, per-IP rate limits, and abuse controls to the public PIN check. Return only the minimum courier, ETA, and charge data needed by the UI; do not expose account configuration or raw provider payloads.
- Use a unique local source order number/idempotency key for Shiprocket order creation. Use a MongoDB outbox/job record with a unique `(orderId, eventType)` key so payment verification and Razorpay webhooks cannot create duplicate external orders. Retry transient failures with bounded exponential backoff; keep permanent failures visible for admin recovery.
- Do not make payment confirmation depend on Shiprocket availability. A paid order remains paid if fulfillment API calls fail; mark shipment sync as pending/failed and alert/admin-retry it.
- Verify incoming Shiprocket webhooks with the configured `x-api-key` using constant-time comparison, enforce HTTPS at ingress, validate a narrow schema, deduplicate event IDs or stable event hashes, and reject invalid/replayed events. Use a webhook path that does not contain `shiprocket`, `kartrocket`, `sr`, or `kr`, per provider documentation. Never log full addresses, phone numbers, auth headers, or raw webhook bodies.
- Keep webhook processing and admin operations auditable. Enforce admin role checks for retry, cancellation, and ready-to-ship actions. Customer tracking endpoints must return only the caller's own order or a high-entropy guest-authorized order.
- Minimize retained PII: send only fields Shiprocket requires, do not duplicate provider payloads in MongoDB, and define retention/deletion behavior for address/contact data.

## Data and API design

### Shipment snapshot on `Order`

Add a nested, non-secret fulfillment record with fields such as:

- `provider`: `shiprocket`
- `syncStatus`: `not_ready | queued | synced | failed`
- `shiprocketOrderId`, `shipmentId`, `awbCode`, `courierName`, `labelUrl`
- `shipmentStatus`, `lastTrackingAt`, `estimatedDeliveryAt`
- `attemptCount`, `lastErrorCode` (sanitized code only), `updatedAt`
- immutable package snapshot: total weight/dimensions and source order number

Never store API credentials, bearer tokens, or full raw provider responses on orders. Add unique sparse indexes for provider order/shipment IDs as supported by existing data.

### Endpoints (final paths/names may follow existing router conventions)

- `POST /api/v1/orders/serviceability` — accepts cart/Buy Now identifiers, quantity and destination PIN; derives parcel and payment parameters from server data; returns normalized availability/rates/ETA.
- `POST /api/v1/orders/quote` — revalidates serviceability and calculates the final shipping amount server-side before order creation.
- `POST /api/v1/admin/orders/:orderId/ship` — authorized, idempotent ready-to-ship action; assigns courier/AWB and requests pickup according to the approved policy.
- `POST /api/v1/hooks/fulfillment` — protected provider webhook endpoint; no provider name in URL path, consistent with Shiprocket guidance.
- Existing customer/admin order read APIs expose only normalized shipment state and tracking link data.

### State transitions

`unpaid order -> payment verified -> fulfillment queued -> Shiprocket order created -> ready to ship approved -> AWB assigned -> pickup requested -> in transit -> delivered`

Failure branches are explicit: payment failed/cancelled means no Shiprocket order; serviceability unavailable blocks checkout; provider timeout leaves a retryable queued/failed sync state; duplicate callbacks/webhooks are no-ops; shipment cancellation is allowed only before dispatch and must reconcile both systems.

## Delivery phases and task list

### Phase 0 — Account/configuration and contracts

- [ ] T-SR01 Confirm Shiprocket API user credentials exist in backend runtime, without echoing values; configure them in local ignored env and production secret manager. Confirm API user/module access and pickup location.
  - Acceptance: backend startup/preflight reports configured/missing by boolean only; no secret appears in logs, build artifacts, frontend bundle, or git.
  - Verify: inspect variable names only, run config validation, scan tracked files and built frontend for secret names/values (without printing secret values).
  - Dependencies: none.
- [ ] T-SR02 Confirm origin pickup PIN, package weight/dimensions per sellable product/variant, supported destination region, serviceability outage behavior, and whether COD is in scope. This plan assumes Razorpay prepaid only and Indian PIN codes initially.
  - Acceptance: approved data source for parcel measurements and exact fail-open/fail-closed customer behavior is recorded.
  - Verify: catalog audit and test data cover each active SKU/variant.
  - Dependencies: none.
- [ ] T-SR03 Define normalized serviceability and shipment contracts plus order/payment/fulfillment transition rules.
  - Acceptance: contracts cannot accept client-owned amounts/weight/courier choice; duplicate payment events converge on one fulfillment job.
  - Verify: schema and state-transition review.
  - Dependencies: T-SR01, T-SR02.

### Checkpoint A — Readiness

- [ ] Credentials are configured in the backend runtime and API user access/pickup location are verified without exposing secrets.
- [ ] Product packaging measurements and operational booking policy are known.

### Phase 1 — Secure Shiprocket client and durable jobs

- [ ] T-SR04 Implement backend Shiprocket auth/client service with token caching/refresh, HTTPS-only fixed host, timeout, bounded retry, response validation, and redacted errors.
  - Acceptance: no credentials/token cross the API boundary or enter logs; invalid/missing config fails safely; auth refresh handles expiry once.
  - Verify: mocked auth/API tests for success, bad credentials, expiry, timeout, malformed JSON, 429/5xx, and redaction.
  - Dependencies: T-SR03.
- [ ] T-SR05 Add shipment fields/indexes and a durable fulfillment outbox/worker with unique deduplication, retry schedule, dead-letter/admin visibility, and atomic job claims.
  - Acceptance: repeated payment verification/webhooks produce one Shiprocket create-order job; worker restart does not lose jobs.
  - Verify: duplicate-event, concurrent-worker, restart/retry, and migration tests.
  - Dependencies: T-SR03, T-SR04.

### Phase 2 — Early PIN availability and final checkout quote

- [ ] T-SR06 Add a protected-shape, rate-limited public serviceability endpoint that loads cart/product data server-side and calls Shiprocket with pickup PIN, destination PIN, total weight, and payment mode.
  - Acceptance: only valid six-digit PINs and server-derived package values reach provider; raw provider data is normalized; provider failure has the approved safe response.
  - Verify: validation, abuse throttling, guest/auth cart ownership, no-data-leak, and provider failure tests.
  - Dependencies: T-SR04, T-SR02.
- [ ] T-SR07 Add PIN-first UI and recheck serviceability during authoritative quote/order submission; derive shipping amount only from server-selected policy and provider data.
  - Acceptance: users learn serviceability before entering full address; stale/tampered quote cannot alter totals or bypass final recheck.
  - Verify: storefront flow and API tampering tests.
  - Dependencies: T-SR06.

### Checkpoint B — Checkout delivery check

- [ ] Available PIN displays normalized serviceability and ETA; unavailable PIN cannot proceed.
- [ ] Provider outage does not claim delivery is available; retries remain usable and checkout errors are clear.
- [ ] Final order total is backend-calculated and matches the approved freight policy.

### Phase 3 — Paid order handoff and admin shipment approval

- [ ] T-SR08 Enqueue fulfillment exactly once on the canonical paid transition, covering both Razorpay callback verification and webhook reconciliation.
  - Acceptance: unpaid/failed orders never reach Shiprocket; paid orders survive provider outages and stay visible with retryable sync state.
  - Verify: callback/webhook race, duplicate payment event, and provider-down recovery tests.
  - Dependencies: T-SR05.
- [ ] T-SR09 Create Shiprocket custom orders from immutable local order/item/address/package snapshots and persist returned IDs idempotently.
  - Acceptance: retries reuse the stable merchant order reference and reconcile existing Shiprocket orders rather than duplicate them; payload contains no client prices/PII beyond validated order data.
  - Verify: provider contract tests, duplicate create recovery, validation, and redacted logging checks.
  - Dependencies: T-SR08, T-SR02.
- [ ] T-SR10 Add admin order shipping state, safe retry, and authorized “Ready to ship / book pickup” operation that assigns AWB and requests pickup, then stores normalized courier/tracking response.
  - Acceptance: payment and shipping statuses are separate; double-click/retry cannot double-book; errors are actionable but sanitized.
  - Verify: admin authorization, idempotency, already-shipped/cancelled state, and error path tests.
  - Dependencies: T-SR09.

### Checkpoint C — Local admin and Shiprocket agree

- [ ] One paid staging order appears in both systems with matching items/address/value and local Shiprocket identifiers.
- [ ] Admin approval assigns tracking/pickup once; failed provider operations remain recoverable.

### Phase 4 — Tracking, operations, and release

- [ ] T-SR11 Implement Shiprocket webhook verification, replay protection, event deduplication, narrow status mapping, and order update audit trail.
  - Acceptance: forged, malformed, and replayed events cannot alter orders; valid events update shipment only and never payment state.
  - Verify: signature, replay, event ordering, and status mapping tests.
  - Dependencies: T-SR05, T-SR10.
- [ ] T-SR12 Expose customer-owned tracking and admin shipment details; add retry/exception dashboards and alerts for stuck fulfillment jobs.
  - Acceptance: admin can see queued/failed/label/dispatch/delivery states; customers only see their order's safe tracking details.
  - Verify: authorization, PII minimization, and status reconciliation review.
  - Dependencies: T-SR11.
- [ ] T-SR13 Complete staging-to-production rollout, provider webhook registration, operational runbook, rollback switch, and live order reconciliation.
  - Acceptance: staging scenarios pass; production secrets are host-managed; rollout can disable new Shiprocket calls without blocking payment/order creation.
  - Verify: live low-value order from checkout through delivery status, dashboard reconciliation, and rollback rehearsal.
  - Dependencies: T-SR12.

### Checkpoint D — Production readiness

- [ ] Razorpay payment, local order, Shiprocket order, AWB/pickup, and tracking are reconciled end to end.
- [ ] Monitoring alerts on repeated auth errors, stuck outbox jobs, webhook failures, and paid orders not synced.
- [ ] Rollback disables Shiprocket dispatch while preserving local paid orders for later manual fulfillment.

## Threats and mitigations

| Threat/failure | Control |
|---|---|
| Credential/token disclosure | Backend-only secret storage, no frontend env exposure, redaction, least-privilege API user, rotation procedure |
| Fake PIN checks / provider cost abuse | Strict validation, rate limit, request size cap, bot controls at edge where available |
| Client manipulates weight, rate, destination, or total | Re-derive from catalog/order; authoritative quote; final server-side recheck |
| Forged/replayed provider webhook | Secret header verification, constant-time compare, event dedupe, schema allowlist |
| Duplicate Shiprocket order/pickup | Stable source reference, unique outbox key, atomic claims, state-aware idempotent operations |
| Payment succeeded but Shiprocket unavailable | Persist paid state first; durable retry and admin visibility; never roll back payment/order |
| Stale serviceability response | Short-lived display hint only; recheck on final submit; no delivery guarantee language |
| Premature pickup booking | Require admin ready-to-ship approval after packing by default |
| PII leakage | Minimize provider payload/logs, field-level response shaping, access checks, retention policy |

## Open decisions before implementation

1. Before enabling live traffic, set the Shiprocket API user credentials, pickup PIN, existing pickup location, and webhook secret in the backend environment. The inspected local env files do not currently contain the Shiprocket credentials.
2. The user will add the pickup PIN and packed product weights/dimensions in admin; measurements must reflect the actual parcel process.
3. Confirmed: admin approves after packing. The implementation creates the Shiprocket order after payment, then waits for admin approval before AWB/pickup booking.
4. Checkout blocks if serviceability cannot be confirmed, including provider outages. A future pending-verification fallback would need explicit customer-facing behavior and an operations process.
5. COD is not included; checkout remains Razorpay prepaid.

## Definition of done

- PIN-level availability is displayed before full address entry, using server-derived package data.
- Checkout prices/stock/payment remain authoritative in the existing backend; Razorpay secrets and Shiprocket credentials never reach the browser.
- Each verified paid order is idempotently synchronized to Shiprocket and visible in the store admin.
- Authorized admin can approve a packed parcel for courier/AWB/pickup booking; tracking webhooks update both admin and customer order state.
- All provider failures, duplicate deliveries, retries, and replayed webhooks are safe and observable without leaking secrets or unnecessary PII.
- Staging end-to-end and rollback checks pass before production activation.
