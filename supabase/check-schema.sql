-- ROYAL INK — read-only check that a database matches supabase/migrations + the reference seed.
-- Changes nothing. Run in the Supabase SQL Editor, or with psql / `supabase db query`.
-- Every row should say ok = true before the migration history is repaired (see README).
with expected_tables(name) as (values
  ('categories'), ('brands'), ('product_groups'), ('products'), ('product_images'), ('inventory'),
  ('inventory_movements'), ('price_tiers'), ('printer_series'), ('printers'), ('product_compatibility'),
  ('profiles'), ('business_accounts'), ('wilayas'), ('communes'), ('pickup_points'), ('delivery_rates'),
  ('addresses'), ('carts'), ('cart_items'), ('wishlist_items'), ('promo_codes'), ('orders'), ('order_items'),
  ('order_status_history'), ('return_requests'), ('quote_requests'), ('quote_request_items'), ('reviews'),
  ('banners'), ('collections'), ('collection_products'), ('settings')),
expected_functions(name) as (values
  ('place_order'), ('set_order_status'), ('adjust_stock'), ('apply_stock_change'), ('search_products'),
  ('search_suggestions'), ('product_availability'), ('find_guest_order'), ('submit_quote'), ('set_user_role'),
  ('unit_price'), ('is_staff'), ('is_admin'), ('category_tree'), ('normalize_dz_phone')),
expected_types(name) as (values
  ('product_type'), ('product_status'), ('product_origin'), ('yield_type'), ('ink_color'), ('printer_kind'),
  ('user_role'), ('business_status'), ('delivery_method'), ('payment_method'), ('payment_status'),
  ('order_status'), ('stock_reason'), ('promo_kind'), ('quote_status'), ('return_status'), ('review_status')),
expected_views(name) as (values
  ('printer_supplies'), ('product_printers'), ('admin_daily_sales'), ('admin_best_sellers'), ('admin_stock_alerts'))
select 'tables' as check, count(*) filter (where c.oid is null) = 0 as ok,
       coalesce(string_agg(e.name, ', ') filter (where c.oid is null), '') as missing
  from expected_tables e left join pg_class c on c.relname = e.name and c.relkind = 'r'
   and c.relnamespace = 'public'::regnamespace
union all
select 'rls enabled on every public table', bool_and(c.relrowsecurity),
       coalesce(string_agg(c.relname, ', ') filter (where not c.relrowsecurity), '')
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
union all
select 'functions', count(*) filter (where p.oid is null) = 0,
       coalesce(string_agg(e.name, ', ') filter (where p.oid is null), '')
  from expected_functions e left join pg_proc p on p.proname = e.name and p.pronamespace = 'public'::regnamespace
union all
select 'enum types', count(*) filter (where t.oid is null) = 0,
       coalesce(string_agg(e.name, ', ') filter (where t.oid is null), '')
  from expected_types e left join pg_type t on t.typname = e.name and t.typnamespace = 'public'::regnamespace
union all
select 'views', count(*) filter (where c.oid is null) = 0,
       coalesce(string_agg(e.name, ', ') filter (where c.oid is null), '')
  from expected_views e left join pg_class c on c.relname = e.name and c.relkind = 'v'
   and c.relnamespace = 'public'::regnamespace
union all
select 'extensions (pgcrypto, pg_trgm, unaccent, citext)', count(*) = 4, ''
  from pg_extension where extname in ('pgcrypto', 'pg_trgm', 'unaccent', 'citext')
union all
select 'policies (>= 61)', count(*) >= 61, count(*)::text || ' found'
  from pg_policies where schemaname = 'public'
union all
select 'seed: 58 wilayas', (select count(*) from public.wilayas where code between 1 and 58) = 58,
       (select count(*) from public.wilayas)::text || ' rows'
union all
select 'seed: 16 categories', (select count(*) from public.categories where slug in (
         'ink-toner', 'ink-bottles', 'ink-cartridges', 'toner-cartridges', 'printers', 'inkjet-printers',
         'laser-printers', 'multifunction-printers', 'tank-printers', 'supplies', 'drum-units',
         'maintenance-boxes', 'printer-parts', 'paper', 'labels', 'cleaning')) = 16,
       (select count(*) from public.categories)::text || ' rows'
union all
select 'seed: settings', (select count(*) from public.settings where key in ('reviews_enabled', 'store')) = 2, ''
union all
-- Informational: false just means the schema was applied outside the CLI (e.g. SQL Editor).
select 'cli migration history present', to_regclass('supabase_migrations.schema_migrations') is not null, ''
union all
-- Must stay ok: the test fixtures (tests/db/02_fixtures.sql) must never be in a real database.
select 'no test fixtures', not exists (select 1 from public.products where sku in ('CRG057H-OEM', 'RI-057H', 'CF259A', 'GI41C', 'DRAFT-1'))
       and not exists (select 1 from public.promo_codes where code in ('WELCOME10', 'BIG', 'SHIPFREE')), '';
