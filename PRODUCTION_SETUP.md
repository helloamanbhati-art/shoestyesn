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

The API hosting provider must receive the backend variables separately. Local `.env` and `.env.local` files are git-ignored and are not uploaded by Git deployments. The backend `CLERK_PUBLISHABLE_KEY` must exactly match the storefront's `VITE_CLERK_PUBLISHABLE_KEY`, and the Razorpay key ID must match on both sides. Use live Clerk/Razorpay keys only for production and test keys only for local/staging environments.

MongoDB must run as a replica set (MongoDB Atlas already does) because checkout reserves all product lines and creates the order in one transaction.

Before launch:

1. Back up MongoDB, then run `npm run migrate:phones:dry-run` in `backend`. Resolve every invalid or duplicate identity before running `npm run migrate:phones`.
2. Run `npm test` in `backend`.
3. Run `npm run build` in `frontend` and `admin`.
4. Run `npm run audit:inventory` in `backend`. `Product.stock` is authoritative; investigate every reported legacy `Inventory` discrepancy before archiving that collection.
5. Configure Razorpay webhooks for `order.paid` and `payment.failed` at `/api/v1/payments/webhook/razorpay`.
6. Test OTP, cart merge, checkout, captured payment, webhook replay, order cancellation, delivery stock settlement, and admin totals in a staging environment.
