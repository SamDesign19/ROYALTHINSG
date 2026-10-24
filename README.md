# ROYAL INK — commerce platform

Online store for printers, ink, toner and printing supplies, starting in Algeria (DZD, cash on delivery,
58 wilayas) in Arabic, French and English.

**Current state: Phase 2 complete — the Next.js storefront (catalog, search, product pages, "Find your ink",
AR/FR/EN with RTL) runs on the Phase 1 database.** Cart, checkout, accounts and the admin are next;
see [Phase status](docs/ARCHITECTURE.md#phase-status).

## What works today

The whole commerce core runs in PostgreSQL (Supabase) and is covered by an automated test suite:

* Catalog: categories (tree), brands, products with OEM/compatible origin, colour, yield, volume, specs,
  images, variants (groups), volume pricing tiers, draft/active/archived.
* **Printer compatibility engine**: brand → series → model; many-to-many verified links; reverse lookup;
  unverified links stored but never shown to shoppers.
* Search: product names (AR/FR/EN), cartridge/toner codes and SKUs (punctuation-insensitive), OEM references,
  printer models, typo tolerance, autocomplete (products, printers, categories), filters (category tree, brand,
  type, colour, origin, price, stock, printer) and sorting (relevance, popularity, newest, price).
* Checkout: server-side pricing, promo codes (percent / fixed / free shipping, limits, minimums), delivery
  rates per wilaya and method (home / pickup), Algerian phone validation, stock locking (verified under
  concurrent orders), guest and signed-in orders, guest tracking by order number + phone.
* Orders: status workflow, restock on cancellation, invoice numbers, COD paid on delivery, full history.
* Inventory: audited stock movements, low-stock and out-of-stock alerts.
* B2B: business accounts (NIF/NIS/RC), approved-business volume prices, quotation requests.
* Reviews (moderated, off by default), banners, collections, settings.
* Security: Row Level Security on every table; orders and quotations only through validated functions.

## Storefront (Next.js)

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · next-intl 4 · Supabase JS. Node 20.9+.

```bash
npm install
cp .env.example .env.local      # fill in the Supabase URL and anon key
npm run dev                     # http://localhost:3000 → redirects to /ar (or the browser's language)
```

Pages: home, `/search`, `/c/[category]`, `/brands`, `/brands/[brand]`, `/p/[slug]`, `/find-your-ink`,
`/find-your-ink/printer/[slug]`, `/collections/[slug]`, each under `/ar`, `/fr` and `/en`.
All data comes from the database through the Phase 1 functions and RLS (anon key only); nothing is hard-coded.

`NEXT_PUBLIC_*` variables are inlined at build time, so set them before `npm run build` on the host.

| Command | What it does |
|---|---|
| `npm run lint` / `npm run typecheck` | ESLint, TypeScript (generates route types first) |
| `npm test` | Unit tests (Vitest) |
| `npm run build && npm start` | Production build; no database access at build time |
| `npm run test:e2e` | Playwright tests against the local stack and a production build |

### Local stack without a Supabase project

`scripts/local-stack.sh up` starts PostgreSQL and PostgREST in Docker, applies every migration and the
reference seed, loads the **test-only** fixtures (`tests/db/02_fixtures.sql`, invented data) and exposes them
like a Supabase project on `http://127.0.0.1:54321`. It prints the variables for `.env.local`
(also written to `.local-stack/env`). Needs Docker, `psql` and Node. Auth and Storage are not emulated.

```bash
scripts/local-stack.sh up && cp .local-stack/env .env.local
npm run build && npm run test:e2e
scripts/local-stack.sh down
```

## Run the database tests

Requires PostgreSQL 15+ with the contrib extensions (`pg_trgm`, `unaccent`, `pgcrypto`, `citext`) and a superuser:

```bash
PGUSER=postgres scripts/db-test.sh
```

The script creates a throw-away database, adds a minimal Supabase shim (`tests/db/00_supabase_shim.sql`),
applies every migration and the reference seed, loads test-only fixtures and runs the suites in `tests/db/`.
CI runs the same script on every push (`.github/workflows/database.yml`).

## Set up Supabase

1. Create a Supabase project (region closest to Algeria, e.g. Frankfurt).
2. Install the Supabase CLI, then from this folder: `supabase link --project-ref <ref>` and `supabase db push`.
3. Load reference data: run `supabase/seed/01_reference.sql` in the SQL editor.
4. Create storage buckets `product-images` (public), `banners` (public), `quotes` (private).
5. Sign up your own account, then make it admin in the SQL editor:
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
6. Copy `.env.example` to `.env.local` and fill in the project URL and keys (service role key: server only).

## Documentation

* [Architecture, site map, phase status](docs/ARCHITECTURE.md)
* [Design system](docs/DESIGN_SYSTEM.md) and [tokens](design/tokens.css)
* [Data policy — what must still be provided](docs/DATA.md)

## Known limitations

* No cart, checkout, customer accounts, B2B pages or admin yet (Phases 4–5): product pages show price and
  availability but have no "Add to cart" button, and the header has no account or cart icon.
* The home page has no "Best sellers" row: the public API cannot tell real sales from zero sales, and the
  row is not shown with invented popularity. Brand logos are not displayed yet (no bucket defined for them).
* Listing pages (search, category, brand, printer) render per request without a data cache; home, product,
  brand-index, collection and "Find your ink" pages are cached and revalidated every 60–300 s.
* Communes, delivery fees, pickup points, products, prices, stock and compatibility are empty until entered by the business.
* Only cash on delivery; no online payment until a provider is contracted.
* Tested against PostgreSQL 16 with a Supabase shim and PostgREST (the storefront too), not yet against a live Supabase project.
