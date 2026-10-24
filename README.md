# ROYAL INK — commerce platform

Online store for printers, ink, toner and printing supplies, starting in Algeria (DZD, cash on delivery,
58 wilayas) in Arabic, French and English.

**Current state: the storefront (catalog, search, product pages, "Find your ink", AR/FR/EN with RTL),
cash-on-delivery ordering (cart, checkout, confirmation, order tracking) and the back office (`/admin`: orders,
products, stock, printers and compatibility, categories and brands, delivery, promo codes) run on the Phase 1
database.** Customer accounts and B2B pages are next; see [Phase status](docs/ARCHITECTURE.md#phase-status).

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
(also written to `.local-stack/env`). Needs Docker, `psql` and Node. Supabase Auth runs too (GoTrue), with a
**test-only** admin account `admin@royalink.test` / `local-admin-password`. Storage is not emulated.

```bash
scripts/local-stack.sh up && cp .local-stack/env .env.local
npm run build && npm run test:e2e
scripts/local-stack.sh down
```

## Back office (`/admin`)

French-only, at `https://<site>/admin`. Staff sign in with e-mail and password (Supabase Auth); everything
they do goes through their own session, so the database's RLS policies decide what is allowed, and no
service-role key is needed on the host.

Create a staff account (Supabase dashboard):

1. **Authentication → Users → Add user → Create new user**: e-mail + password, tick *Auto Confirm User*.
2. **SQL editor**: `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
   (use `'staff'` for team members who must not manage roles).

| Page | What it does |
|---|---|
| Tableau de bord | Orders to handle, today's orders, 30-day revenue, stock alerts, best sellers, drafts to review |
| Commandes | Filter by status, search; order page: confirm (issues the invoice number), prepare, ship, deliver (marks COD paid), cancel (restocks), internal note, print |
| Produits | Search, filter (status, category, missing price), bulk publish / draft / featured / archive; edit page: all fields in AR/FR/EN, stock movements, low-stock threshold, volume prices, printer compatibility (verified or not) |
| Stock | Alerts and the latest movements |
| Imprimantes | Brands → series → models for "Find your ink" |
| Catégories & marques | Names in three languages, order, visibility; brands and "makes printers" |
| Livraison | Fees per wilaya and method (fill-all helper), free-delivery threshold, delivery times, pickup points |
| Codes promo | Percent, fixed or free shipping, minimum, limits, end date |

Not yet in the back office: product photo upload, banners and collections, quotations and business accounts,
returns, user roles (SQL above) and CSV import/export.

Supabase Auth allows public sign-up by default. Customer accounts are not used yet, and a self-registered account
has the `customer` role (no back-office access, RLS applies), but you can turn sign-up off in
**Authentication → Providers → Email** until accounts are added to the store.

## Import the ROYALINK catalog

`scripts/import/royalink_db_to_sql.py` turns the stock export `ROYALINK DATABASE.xlsx` (private repository
`ROYALINK`) into SQL for the Supabase SQL editor:

```bash
python3 scripts/import/royalink_db_to_sql.py "path/to/ROYALINK DATABASE.xlsx"   # -> .local-imports/royalink-catalog.sql
```

* Every product is imported as a **draft** (invisible) with its opening stock; the price column of the export
  is kept as a suggested price because it is not confirmed as a selling price. Review prices, then publish
  (example query at the end of the generated file).
* Safe to re-run: nothing existing is changed, stock is recorded once. No printer compatibility is imported.
* The generated file contains business data: it is git-ignored and must not be committed (this repo is public).

## Open ordering: delivery fees

Checkout lists only wilayas that have an active delivery rate. Until rates exist, `/checkout` says ordering is
not open yet. Example (SQL editor), one fee for every wilaya, home delivery only:

```sql
insert into delivery_rates (wilaya_code, method, fee_dzd, free_over_dzd, eta_min_days, eta_max_days)
select code, 'home', 600, null, 2, 5 from wilayas
on conflict (wilaya_code, method) do update set fee_dzd = excluded.fee_dzd;
```

Pickup needs rows in `pickup_points` plus a `pickup` rate for that wilaya.

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
2. Apply the schema (see [Existing project](#existing-project-check-before-pushing) if it is not empty):
   `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push --dry-run`, then
   `npx supabase db push`. (Without the CLI: paste `supabase/setup.sql` into the SQL editor, once, on an empty project.)
3. Load reference data: run `supabase/seed/01_reference.sql` in the SQL editor. It only inserts missing rows,
   so it is safe to re-run. Never load `tests/db/02_fixtures.sql` into a real project.
4. Create storage buckets `product-images` (public), `banners` (public), `quotes` (private).
5. Sign up your own account, then make it admin in the SQL editor:
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
6. Copy `.env.example` to `.env.local` and fill in the project URL and keys (service role key: server only).

### Existing project: check before pushing

If the schema was applied with `supabase/setup.sql` in the SQL editor, the project has the tables but no CLI
migration history, and `db push` would try to re-run every migration. It fails on the first statement and
rolls back (nothing is lost), but it cannot succeed. Instead:

1. Run `supabase/check-schema.sql` in the SQL editor (read-only). Every row must say `ok = true`, except
   `cli migration history present`, which is `false` in this case.
2. Record the migrations as already applied, without running them:
   `npx supabase migration repair --status applied 20261023000001 20261023000002 20261023000003 20261023000004 20261023000005 20261023000006 20261023000007`
3. `npx supabase db push --dry-run` must now report the database as up to date. Later migrations are then
   pushed normally.

If any check other than the history row fails, do not repair. Compare the project with `supabase/migrations` first.

## Documentation

* [Architecture, site map, phase status](docs/ARCHITECTURE.md)
* [Design system](docs/DESIGN_SYSTEM.md) and [tokens](design/tokens.css)
* [Data policy — what must still be provided](docs/DATA.md)

## Known limitations

* Ordering is guest-only (no customer accounts yet), cash on delivery only. No B2B pages yet.
* The back office is French-only and has no photo upload yet (images go into the `product-images` bucket and
  `product_images` table from the Supabase dashboard).
* The order rate limit is per server instance (in memory), so on serverless hosting it only slows down abuse.
* The home page has no "Best sellers" row: the public API cannot tell real sales from zero sales, and the
  row is not shown with invented popularity. Brand logos are not displayed yet (no bucket defined for them).
* Listing pages (search, category, brand, printer) render per request without a data cache; home, product,
  brand-index, collection and "Find your ink" pages are cached and revalidated every 60–300 s.
* Communes, delivery fees, pickup points, products, prices, stock and compatibility are empty until entered by the business.
* Only cash on delivery; no online payment until a provider is contracted.
* Tested against PostgreSQL 16 with a Supabase shim and PostgREST (the storefront too), not yet against a live Supabase project.
