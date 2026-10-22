# Capability Map: Mobile-authenticated commerce

Status: Draft for owner approval before implementation.

| Module id | Responsibility | Depends on |
|---|---|---|
| `customer-identity` | Clerk email, Google, and phone login with verified bearer sessions and customer profile | Existing MongoDB connection |
| `customer-cart` | Server-owned cart, product/variant/size validation, guest-cart merge after login | `customer-identity`, existing catalog/inventory |
| `customer-addresses` | Authenticated address create/list/update/default selection | `customer-identity` |
| `checkout-orders` | Server price calculation, stock checks, pending order creation, order history | `customer-cart`, `customer-addresses`, existing catalog/inventory |
| `razorpay-payments` | Razorpay order creation, signature verification, webhooks, idempotent payment state | `checkout-orders`, `customer-identity` |
| `live-admin` | Real customers, orders, payments, inventory, and analytics from backend APIs | All modules above, existing admin auth |
| `production-operations` | Secrets, deployment, observability, backups, security checks, end-to-end verification | All modules above |

Build order: `customer-identity` -> `customer-cart` and `customer-addresses` -> `checkout-orders` -> `razorpay-payments` -> `live-admin` -> `production-operations`.

## Intended customer journey

1. User opens a real backend-sourced product, selects an available variant/size, and adds it to the cart.
2. User opens checkout. A mobile-number login gate appears before the address section.
3. User enters a country code and mobile number, receives an OTP, and verifies it. A first login creates one customer record; later logins resolve the same normalized E.164 number to that record from any supported country.
4. The backend merges any anonymous cart into the authenticated customer's server cart.
5. The user selects an existing address or submits a new address. The address is saved to the customer account in MongoDB.
6. The backend revalidates stock and calculates item prices, discounts, tax, shipping, and the final total. The browser cannot supply authoritative money values.
7. The backend creates a pending order and a Razorpay order. The frontend opens Razorpay Checkout using the returned public key and order details.
8. After payment, the backend verifies Razorpay's signature and reconciles the webhook. Only a verified/captured payment can mark the order paid.
9. The success page fetches the paid order from the backend. The admin sees the same customer, order, payment, and totals from backend APIs.

## Local browser storage policy

Allowed: theme, cookie-consent choice, non-sensitive UI preferences, and optionally a short-lived anonymous cart identifier.

Not allowed: auth tokens, OTPs, customer profiles, addresses, orders, payment status, inventory, product truth, prices/totals, admin authentication, or analytics source data.
