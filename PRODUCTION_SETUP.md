# Production setup

The storefront, admin, and API must use HTTPS. Configure the API with:

- `NODE_ENV=production`
- a random `JWT_ACCESS_SECRET` of at least 32 characters
- `FRONTEND_URL`, `ADMIN_URL`, and `ALLOWED_ORIGINS` containing the exact HTTPS origins
- `AUTH_COOKIE_SECURE=true`; the production code defaults to `AUTH_COOKIE_SAME_SITE=none` for separately hosted frontend/API services. Use `lax` only when they share the same site.
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the production Clerk instance
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a separate `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MOCK_MODE=false`

Set `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_ADMIN_URL`, and the matching public `VITE_RAZORPAY_KEY_ID` in the storefront hosting provider before building. Vite embeds `VITE_*` values into the browser bundle at build time, so changing them requires a redeploy. Never put `CLERK_SECRET_KEY` or `RAZORPAY_KEY_SECRET` in the storefront/admin environment.

For the Vercel admin deployment, leave `VITE_API_URL` unset. `admin/vercel.json` proxies `/api` to the Render backend on the same browser origin, avoiding third-party-cookie blocking. Keep `ADMIN_URL` and `ALLOWED_ORIGINS` on the backend set to the admin's exact public HTTPS origin.

## Free-tier reliability settings

The backend intentionally keeps MongoDB usage bounded. The defaults are suitable for one small Render instance and do not need extra environment variables:

- `MONGODB_MAX_POOL_SIZE=5` limits concurrent database connections.
- `MONGODB_MAX_IDLE_MS=30000` releases idle sockets.
- `MONGODB_SELECTION_TIMEOUT_MS=10000` fails unavailable database requests instead of hanging indefinitely.
- `MONGODB_SOCKET_TIMEOUT_MS=45000` bounds slow operations.
- `MONGODB_WAIT_QUEUE_TIMEOUT_MS=5000` prevents an overloaded request queue from consuming all memory.

Only increase the pool after checking the database provider's connection limit. The admin loads the complete order history once, then uses an indexed `updatedAt` cursor every three seconds to transfer only changed orders. It pauses synchronization in hidden/offline tabs, prevents overlapping requests, and retries only safe read requests. Write requests are never automatically retried because duplicate product, order, or payment mutations are more damaging than a visible retry prompt.

Render free services can sleep or have monthly usage limits, so this design improves recovery and reduces load but cannot guarantee unlimited requests or continuous 24/7 availability. Use a paid always-on instance when uninterrupted operation becomes a business requirement.

The API hosting provider must receive the backend variables separately. Local `.env` and `.env.local` files are git-ignored and are not uploaded by Git deployments. The backend `CLERK_PUBLISHABLE_KEY` must exactly match the storefront's `VITE_CLERK_PUBLISHABLE_KEY`, and the Razorpay key ID must match on both sides. Use live Clerk/Razorpay keys only for production and test keys only for local/staging environments.

MongoDB must run as a replica set (MongoDB Atlas already does) because checkout reserves all product lines and creates the order in one transaction.

Before launch:

1. Back up MongoDB, then run `npm run migrate:phones:dry-run` in `backend`. Resolve every invalid or duplicate identity before running `npm run migrate:phones`.
2. Run `npm test` in `backend`.
3. Run `npm run build` in `frontend` and `admin`.
4. Run `npm run audit:inventory` in `backend`. `Product.stock` is authoritative; investigate every reported legacy `Inventory` discrepancy before archiving that collection.
5. Configure Razorpay webhooks for `order.paid` and `payment.failed` at `/api/v1/payments/webhook/razorpay`.
6. Test OTP, cart merge, checkout, captured payment, webhook replay, order cancellation, delivery stock settlement, and admin totals in a staging environment.
