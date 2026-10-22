# Spec: Shoe Style rebrand

## Objective
Replace legacy clothing-store identity in the customer storefront and admin UI with the supplied Shoe Style business details. Make verified contact, location, Instagram, tagline, and product-category information easy to find without inventing catalogue, pricing, policy, or operational facts.

## Tech Stack
- React 18, TypeScript, React Router, Vite, Tailwind CSS
- Existing Express/MongoDB backend contracts remain unchanged

## Commands
- Storefront build: `cd frontend && npm run build`
- Admin build: `cd admin && npm run build`
- Legacy-brand audit: `rg -n -i "Harish|Siddhi|A&S" frontend/src frontend/index.html admin/src admin/index.html`

## Project Structure
- `frontend/src/app`: customer storefront and its embedded admin routes
- `frontend/public`: storefront brand assets
- `admin/src/app`: standalone admin interface
- `admin/public`: standalone admin brand assets

## Code Style
Use existing functional React components and utility classes. Store shared public business facts in a typed constants module instead of duplicating raw values.

## Testing Strategy
- Run both production builds.
- Audit customer/admin source for visible legacy business names.
- Verify unknown information is clearly marked for confirmation rather than invented.

## Boundaries
- Always: use `7982558322` as primary WhatsApp and `7827766744` as secondary call number; preserve backend/storage identifiers.
- Ask first: database migrations, catalogue seeding, or destructive data replacement.
- Never: publish unverified prices, stock, email, opening hours, returns, delivery coverage, COD, or the conflicting `7982558332` number.

## Success Criteria
- Storefront and admin visibly use Shoe Style branding and logo.
- Storefront presents the tagline, Instagram, verified address, contact numbers, and Heels/Office Chappals/Boots/Juttis/Bags collections.
- Size/contact/shipping information matches the supplied confidence level.
- Both Vite applications build successfully.

