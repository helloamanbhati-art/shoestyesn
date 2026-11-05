# Mobile-authenticated commerce task list

## Shiprocket API delivery and fulfillment

Detailed plan: [`tasks/plan-shiprocket-integration.md`](plan-shiprocket-integration.md).

- [ ] T-SR01 Confirm Shiprocket API credentials are configured backend-side; confirm API-user access and pickup location without printing secret values.
  - Verify: backend config preflight reports presence only; scan tracked files/frontend output for exposure.
- [ ] T-SR02 Confirm pickup PIN, product/variant parcel weights and dimensions, regions, Shiprocket outage policy, and COD scope.
  - Verify: active catalog has approved packaging data and checkout behavior is documented.
- [ ] T-SR03 Define serviceability/fulfillment API contracts, quote policy, and state transitions.
  - Verify: schema review confirms server-derived prices/weights and idempotent events.
- [ ] T-SR04 Build secure backend Shiprocket client with API-user token handling, fixed HTTPS host, timeout/retry, response validation, and redaction.
  - Depends on: T-SR03. Verify: mocked auth/API failures and log-redaction checks.
- [ ] T-SR05 Add shipment order fields and durable deduplicated fulfillment outbox/worker.
  - Depends on: T-SR03, T-SR04. Verify: duplicate callbacks, concurrent claims, and worker restart recovery.
- [ ] T-SR06 Add rate-limited PIN serviceability endpoint using server-derived cart and package data.
  - Depends on: T-SR04, T-SR02. Verify: input abuse, auth/guest ownership, and provider failure handling.
- [ ] T-SR07 Add PIN-first checkout UI and authoritative serviceability/shipping recheck at final quote/order submission.
  - Depends on: T-SR06. Verify: no client-tampering bypass and correct available/unavailable/outage states.
- [ ] Checkpoint: PIN availability is useful before address entry; final totals and availability are server-authoritative.
- [ ] T-SR08 Enqueue fulfillment once from the verified paid-order transition covering Razorpay callback and webhook paths.
  - Depends on: T-SR05. Verify: only paid orders sync, payment/webhook races enqueue once, provider outage recovers.
- [ ] T-SR09 Create Shiprocket orders idempotently from local immutable order snapshots and store provider identifiers.
  - Depends on: T-SR08. Verify: retries do not duplicate provider orders and only required PII is sent.
- [ ] T-SR10 Add protected admin ready-to-ship action for AWB assignment and pickup request, with safe retries and shipment state.
  - Depends on: T-SR09. Verify: role, state, double-submit, and provider error cases.
- [ ] Checkpoint: one paid staging order reconciles across Razorpay, local admin, and Shiprocket; admin approval books shipment once.
- [ ] T-SR11 Verify/deduplicate Shiprocket webhooks and map tracking updates without changing payment state.
  - Depends on: T-SR10. Verify: forged, replayed, malformed, and out-of-order events.
- [ ] T-SR12 Add customer-owned tracking view and admin queue/error visibility with operational alerts.
  - Depends on: T-SR11. Verify: authorization and PII minimization.
- [ ] T-SR13 Stage, register provider webhook, document rollback/runbook, and reconcile a low-value live order.
  - Depends on: T-SR12. Verify: end-to-end delivery lifecycle and rollback rehearsal.
- [ ] Final checkpoint: production monitoring detects auth failures, stuck jobs, failed webhooks, and paid orders not synced; rollback can pause Shiprocket dispatch without blocking orders/payments.

## Implementation status (9 October 2026)

- Implemented in code: T02-T18, including mobile OTP identity, rotating cookie sessions, database cart/address/order flows, authoritative checkout totals, Razorpay verification/webhooks, inventory reservation, admin authentication, and database-backed admin reporting.
- Automated verification complete: 67 backend tests and production builds for the storefront and admin.
- Deployment-dependent work remains: choose/configure production domains and providers (T01), configure the production Clerk instance and Razorpay webhook secrets, and complete observability/privacy/restore/staging/live-payment checks (T19-T21).
- Browser and controlled live-payment checkpoints remain unchecked until they are run against the real staging environment; code completion alone is not treated as production proof.

## Phase 0: approve contracts

- [ ] T01 Approve capability map, OTP provider/countries, deployment domains, migration policy, Razorpay readiness, shipping scope, and analytics rules.
  - Acceptance: every decision in `tasks/plan.md` has an owner-approved answer.
  - Verify: architecture review against `CAPABILITY_MAP-mobile-commerce.md`.
  - Dependencies: none.
- [ ] T02 Define API schemas, shared error format, auth/order/payment state diagrams, and environment validation.
  - Acceptance: frontend, backend, and admin contracts are versioned and testable.
  - Verify: schema/contract tests and configuration failure tests.
  - Dependencies: T01.

## Phase 1: mobile identity

- [ ] T03 Add E.164 phone migration with dry-run conflict report and customer indexes.
  - Acceptance: valid legacy numbers normalize safely; duplicates are reported, not silently merged.
  - Verify: migration tests against fixtures and backup copy.
  - Dependencies: T02.
- [ ] T04 Implement OTP provider adapter, challenge persistence, expiry, single-use verification, and abuse limits.
  - Acceptance: request/resend/verify/expired/incorrect/locked flows work without OTP leakage.
  - Verify: unit and integration tests with provider stub.
  - Dependencies: T02.
- [ ] T05 Implement secure customer sessions, refresh rotation, logout, `me`, CSRF, and cookie/CORS policy.
  - Acceptance: sessions work across configured origins and can be revoked; tokens never enter browser storage.
  - Verify: auth integration and security tests.
  - Dependencies: T03, T04.
- [ ] T06 Build storefront phone/OTP modal and auth state provider.
  - Acceptance: checkout blocks at login, handles resend/errors, and resumes after success.
  - Verify: component tests and browser E2E on mobile/desktop.
  - Dependencies: T05.

### Checkpoint A

- [ ] Same phone on two clean browsers resolves to one customer.
- [ ] No auth/customer PII is present in localStorage or sessionStorage.

## Phase 2: cart and addresses

- [ ] T07 Implement server cart model/endpoints with product, variant, size, quantity, stock, and price validation.
  - Acceptance: invalid/unavailable choices fail consistently and current product data is returned.
  - Verify: cart API integration tests.
  - Dependencies: T05.
- [ ] T08 Replace storefront local cart persistence with API-backed cart and deterministic login merge.
  - Acceptance: cart follows authenticated customer across devices; merge never exceeds stock.
  - Verify: reload/login/merge E2E tests.
  - Dependencies: T06, T07.
- [ ] T09 Harden address validation/endpoints and build saved-address checkout UI after login.
  - Acceptance: customers can access only their addresses and can select/save a default address.
  - Verify: ownership tests and checkout UI E2E.
  - Dependencies: T05, T06.

### Checkpoint B

- [ ] Product -> size -> cart -> login -> saved/new address works entirely through backend state.

## Phase 3: checkout and orders

- [ ] T10 Implement authoritative checkout quote service for stock, discount, shipping, tax, and total.
  - Acceptance: manipulated client price/totals have no effect.
  - Verify: pricing unit tests and tampering integration tests.
  - Dependencies: T07, T09.
- [ ] T11 Implement authenticated idempotent order creation and stock reservation/release.
  - Acceptance: order belongs to session customer, contains immutable snapshots, and retries do not duplicate it.
  - Verify: concurrency, idempotency, ownership, and stock tests.
  - Dependencies: T10.
- [ ] T12 Replace checkout `sessionStorage` and order `localStorage` flows with quote/order APIs.
  - Acceptance: refresh/relogin recovers checkout/order state from backend.
  - Verify: browser E2E and storage inspection.
  - Dependencies: T11.

### Checkpoint C

- [ ] Backend totals match database rules and concurrent checkout cannot oversell.

## Phase 4: Razorpay

- [ ] T13 Harden payment-attempt creation with ownership, state, amount, environment, and idempotency checks.
  - Acceptance: only the owner can create one valid attempt for a payable order.
  - Verify: payment integration tests with Razorpay stub/test mode.
  - Dependencies: T11.
- [ ] T14 Implement constant-time callback verification and raw-body signed webhook reconciliation with event deduplication.
  - Acceptance: forged/mismatched/duplicate events cannot mark paid or duplicate transactions.
  - Verify: signature, replay, amount, ownership, and out-of-order event tests.
  - Dependencies: T13.
- [ ] T15 Build Razorpay launch, pending/polling, failure/retry, confirmed-success, and recovery UI.
  - Acceptance: success appears only after backend-confirmed paid state; lost callback recovers via webhook/status.
  - Verify: Razorpay test-mode E2E scenarios.
  - Dependencies: T14.

### Checkpoint D

- [ ] A Razorpay test payment reconciles to one paid order and one successful transaction.

## Phase 5: real admin

- [ ] T16 Replace admin localStorage flag with protected backend admin session/role guard.
  - Acceptance: direct route access and forged browser flags cannot authenticate an admin.
  - Verify: admin auth/authorization tests.
  - Dependencies: T05.
- [ ] T17 Standardize paginated admin customer/order/payment/product APIs and real dashboard analytics.
  - Acceptance: filters and aggregates use database data and documented revenue rules.
  - Verify: API tests with fixtures and direct database comparison.
  - Dependencies: T11, T14, T16.
- [ ] T18 Connect every admin page and remove hardcoded/random/browser-calculated business data.
  - Acceptance: empty DB shows empty/zero states; seeded DB matches expected values.
  - Verify: code audit plus admin browser E2E.
  - Dependencies: T17.

### Checkpoint E

- [ ] Customer, paid order, payment, inventory change, and revenue match across MongoDB, storefront, and admin.

## Phase 6: production readiness

- [ ] T19 Add redacted audit logs, metrics, webhook/OTP/payment alerts, health/readiness, and reconciliation job.
  - Acceptance: failures are diagnosable without logging OTPs/tokens/full PII.
  - Verify: forced-failure tests and alert/log inspection.
  - Dependencies: T14, T17.
- [ ] T20 Complete security, privacy, dependency, backup/restore, retention/export/delete, and secret-management review.
  - Acceptance: no unmitigated reachable high/critical issue and recovery/privacy flows are tested.
  - Verify: security checklist, audit triage, restore rehearsal.
  - Dependencies: T18, T19.
- [ ] T21 Run full build/test/E2E matrix in staging, complete one controlled live payment, document rollback, and release.
  - Acceptance: all definition-of-done items in `tasks/plan.md` pass with evidence.
  - Verify: builds, backend tests, E2E report, Razorpay/database reconciliation record.
  - Dependencies: T20.

## Final checkpoint

- [ ] No fake admin data or business-critical local/session storage remains.
- [ ] Worldwide mobile login works for the approved country set.
- [ ] Razorpay completion is backend-confirmed and visible consistently everywhere.
