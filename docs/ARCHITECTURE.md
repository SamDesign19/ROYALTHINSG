# Architecture

ROYAL INK is a store for printers, ink, toner and printing supplies, starting in Algeria (DZD, 58 wilayas,
cash on delivery), in Arabic (RTL), French and English.

## Stack and why

| Layer | Choice | Reason |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | Server Components for fast, SEO-friendly catalog pages; Server Actions for cart/checkout so secrets stay on the server. |
| UI | **Tailwind CSS + shadcn/ui** (components copied into the repo) | Our own design system on top of accessible Radix primitives; no runtime UI dependency. |
| Database | **PostgreSQL on Supabase** | Relational data (compatibility is many-to-many), transactions for stock, Row Level Security. |
| Auth | **Supabase Auth** (email + password, magic link) | Integrates with RLS through `auth.uid()`. |
| Files | **Supabase Storage** (`product-images`, `banners`, `quotes` buckets) | Served through `next/image` for responsive, optimised images. |
| Search | **Postgres full-text + `pg_trgm`** | Code search, printer-model search and typo tolerance without running a separate search service. Can be swapped for Meilisearch/Typesense later if the catalog grows past ~100k SKUs. |
| i18n | **next-intl** with `/[locale]` routes (`ar` default, `fr`, `en`) | `dir="rtl"` for Arabic, localised formatting of DZD and dates. |

### Where business rules live

Rules that protect money and stock run **inside PostgreSQL** as `SECURITY DEFINER` functions, so they are
atomic and cannot be bypassed from a browser:

| Function | Responsibility |
|---|---|
| `place_order()` | Re-prices every line from the database (volume tiers, promo codes, delivery fee), validates phone/wilaya/commune/pickup point, locks stock rows (`FOR UPDATE`), decrements stock, logs movements, records history, empties the cart. Client-supplied prices are ignored. |
| `set_order_status()` | Enforces the status workflow, restocks on cancellation, issues invoice numbers on confirmation, marks COD paid on delivery. Customers may only cancel their own pending orders. |
| `adjust_stock()` | Staff-only stock changes with an audit trail (`inventory_movements`). |
| `search_products()` / `search_suggestions()` | Search, filters, sorting, autocomplete. Only active products and **verified** compatibility. |
| `submit_quote()` | B2B quotation requests from guests or customers. |
| `product_availability()` | Public in-stock / low-stock flags without exposing quantities. |
| `find_guest_order()` | Guest order tracking by order number + phone. |

The Next.js server layer calls these through the Supabase client (`src/server/supabase.ts`) and validates
input with zod (`src/features/search/params.ts`). Rate limiting and the guest-cart cookie arrive with the
cart in Phase 4.

### Rendering and caching (Phase 2)

* Catalog reads use an anonymous client that sends no cookies, so pages can be cached: home, product,
  brand index, collections and "Find your ink" are rendered on first visit and revalidated (ISR, 60–300 s).
  No page is prerendered at build time, so `next build` never needs the database.
* Pages driven by the query string (search, category, brand, printer) are rendered per request.
* Route handlers: `/api/suggest` (autocomplete), `/api/printers` (Find your ink selector),
  `/api/search/count` (live count in the mobile filter sheet). All read-only, anon key.
* `src/proxy.ts` (Next 16's replacement for middleware) handles locale routing via next-intl.

### Back office (Phase 5)

* `/admin` sits outside locale routing. `src/proxy.ts` refreshes the Supabase session cookie for `/admin/*` and
  sends signed-out visitors to `/admin/login`; every admin page and Server Action calls `requireStaff()`
  (`src/server/auth.ts`, checked against the Auth server and `profiles.role`), and RLS enforces the same rule
  in the database. All writes use the staff member's session (no service-role key).
* Status changes go through `set_order_status()`, stock through `adjust_stock()` (audited movements); products,
  prices, delivery rates, printers, compatibility and promo codes use the staff RLS policies.
* After a change the storefront's cached pages are revalidated (`revalidatePath("/[locale]", "layout")`).
* Local testing: `scripts/local-stack.sh` runs GoTrue (Supabase Auth) so sign-in and RLS are exercised for real.

### Cart and cash-on-delivery checkout (Phase 4, guest)

* The cart is a cookie (`ri_cart`) holding product ids and quantities only: no prices, nothing secret. Server
  Actions (`src/features/cart/actions.ts`) change it; the header reads the item count in the browser, so cached
  catalog pages stay cached. Guests need no database row and no service-role key.
* The cart page prices every line with `unit_price()` (volume tiers included), the function `place_order()` uses.
* Checkout (`src/features/checkout/actions.ts`) validates with zod, normalises the phone like the database,
  then calls `place_order()`, which re-prices, applies the promo code and delivery fee, locks and decrements
  stock and records the order. Database errors map to translated messages.
* Guests cannot read `orders` (RLS), so the confirmation page uses a short-lived httpOnly cookie set when the
  order is placed; tracking uses `find_guest_order()` (order number + phone, sent by POST).

### Security model (implemented in `supabase/migrations/*_security.sql`)

* RLS is enabled on every table. Shoppers read only active catalog rows, verified compatibility and their own
  profile, addresses, cart, wishlist, orders, returns and quotations.
* Orders, order lines and quotations have **no direct INSERT grant**: they are created only by the functions above.
* Customers can update only `full_name`, `phone`, `locale` on their profile (column grants), so they cannot
  change their role. Roles change through `set_user_role()` (admin only).
* Stock quantities, promo codes, analytics and unverified compatibility are staff-only.
* The Supabase **service role key is used only in server code** (guest carts, webhooks) and never shipped to the browser.

## Code layout

```
src/
  app/[locale]/(store)/...      storefront routes (Server Components)
  app/[locale]/(account)/...    customer area
  app/admin/...                 back office (staff/admin only, middleware-guarded)
  components/ui/                design-system primitives (shadcn-based)
  components/store/             product card, gallery, filters, cart drawer...
  features/<domain>/            catalog, search, compatibility, cart, checkout, orders, b2b, admin
    actions.ts                  Server Actions (validated with zod)
    queries.ts                  server-side reads
  server/supabase.ts            server/browser/service clients
  lib/i18n, lib/format          locale routing, DZD/date formatting
supabase/migrations             schema, functions, RLS (this phase)
tests/db                        SQL test suite (this phase)
```

## Site map

```
/[locale]
├── /                              Home: hero, categories, Find your ink, featured, best sellers, new, brands, B2B
├── /search?q=&filters             Results with filters (category, brand, price, colour, origin, stock, printer) and sorting
├── /c/[category]                  Category listing (same filters)
├── /brands/[brand]                Brand listing
├── /p/[slug]                      Product page: gallery, price, availability, specs, verified printers, related, reviews
├── /find-your-ink                 Brand -> series -> model -> compatible supplies
│   └── /printer/[slug]            Supplies for one printer (shareable)
├── /collections/[slug]            Promotional collections
├── /cart                          Cart
├── /checkout                      One-page checkout (guest or signed-in), COD
│   └── /confirmation/[number]     Order confirmation
├── /track                         Guest order tracking (order number + phone)
├── /business                      B2B: account application, quotation request
├── /account                       Dashboard
│   ├── /orders, /orders/[number]  History, status, reorder
│   ├── /addresses, /wishlist, /quotes, /profile
└── /auth/sign-in, /auth/sign-up, /auth/reset
/admin
├── /                              Analytics (real data only), stock alerts
├── /products (+ /new, /[id])      Products, images, specs, prices, volume tiers, variants, CSV import/export
├── /compatibility                 Printers, series, verified links
├── /categories, /brands
├── /inventory                     Adjustments, movement history, low stock
├── /orders (+ /[id])              Status workflow, invoices, cancellations, returns
├── /quotes, /business-accounts
├── /marketing                     Banners, collections, featured, promo codes, SEO
├── /delivery                      Wilayas, communes, rates, pickup points
└── /settings, /users              Store settings, roles (admin)
```

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1. Architecture & design system | Schema, business functions, RLS, reference data, design tokens, docs | **Done — 107 SQL checks + concurrency test passing** |
| 2. Frontend foundation | Next.js app, layout, home, listings, product page, i18n/RTL | **Done — 16 unit tests, 11 Playwright tests (desktop + mobile)** |
| 3. Product engine wiring | Catalog/search/compatibility pages on the real database | **Read side done with Phase 2** (search, filters, autocomplete, Find your ink, verified printers). Remaining: sitemap, admin-triggered cache revalidation |
| 4. Shopping & checkout | Cart, accounts, checkout, order pages | **Guest cart, COD checkout, confirmation and tracking done** (3 Playwright tests). Remaining: customer accounts, order history, wishlist, B2B pages |
| 5. Administration | Back office | **Done for daily operations** (3 Playwright tests): orders, products and bulk publishing, stock, printers and compatibility, categories and brands, delivery, promo codes. Remaining: photo upload, banners/collections, quotes and business accounts, returns, roles UI, CSV import/export |
| 6. Optimisation & verification | SEO, performance, E2E tests (Playwright) | Not started |
