# ROYAL INK — commerce platform

Online store for printers, ink, toner and printing supplies, starting in Algeria (DZD, cash on delivery,
58 wilayas) in Arabic, French and English.

**Current state: Phase 1 complete (database, business logic, security, design system).**
The storefront and admin (Next.js) are not built yet; see [Phase status](docs/ARCHITECTURE.md#phase-status).

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

* No web frontend yet (Phases 2–6). The build environment used so far could not reach the npm registry.
* Communes, delivery fees, pickup points, products, prices, stock and compatibility are empty until entered by the business.
* Only cash on delivery; no online payment until a provider is contracted.
* Tested against PostgreSQL 16 with a Supabase shim, not yet against a live Supabase project.
