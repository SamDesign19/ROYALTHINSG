-- ROYAL INK commerce platform — base extensions, enums and shared helpers.
-- Target: Supabase (PostgreSQL 15+). Apply in filename order on an empty database
-- (supabase db push); they are not written to be re-run.

-- Supabase keeps extensions in the "extensions" schema (already on its search_path).
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type product_type as enum (
  'ink_bottle', 'ink_cartridge', 'toner', 'printer', 'drum', 'maintenance_box',
  'printer_part', 'paper', 'label', 'cleaning', 'other'
);
create type product_status as enum ('draft', 'active', 'archived');
create type product_origin as enum ('original', 'compatible');
create type yield_type as enum ('standard', 'high', 'extra_high');
create type ink_color as enum (
  'black', 'cyan', 'magenta', 'yellow', 'photo_black', 'matte_black', 'grey',
  'light_cyan', 'light_magenta', 'red', 'blue', 'green', 'white', 'tri_color', 'multi', 'none'
);
create type printer_kind as enum ('inkjet', 'laser', 'multifunction', 'tank', 'office', 'home', 'large_format', 'other');
create type user_role as enum ('customer', 'staff', 'admin');
create type business_status as enum ('pending', 'approved', 'rejected');
create type delivery_method as enum ('home', 'pickup');
create type payment_method as enum ('cash_on_delivery');  -- extend only once a real provider is configured
create type payment_status as enum ('unpaid', 'paid', 'refunded');
create type order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
);
create type stock_reason as enum ('initial', 'purchase', 'sale', 'adjustment', 'return', 'cancellation', 'damage');
create type promo_kind as enum ('percent', 'fixed', 'free_shipping');
create type quote_status as enum ('new', 'in_review', 'quoted', 'accepted', 'rejected', 'expired');
create type return_status as enum ('requested', 'approved', 'rejected', 'received', 'refunded');
create type review_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Localised text is stored as {"ar": "...", "fr": "...", "en": "..."}.
create or replace function is_localized(j jsonb) returns boolean
language sql immutable as $$
  select j is not null
     and jsonb_typeof(j) = 'object'
     and (select bool_and(k in ('ar', 'fr', 'en')) from jsonb_object_keys(j) k)
     and coalesce(nullif(j->>'fr', ''), nullif(j->>'en', ''), nullif(j->>'ar', '')) is not null
$$;

-- Lower-case, accent-free text used for search.
create or replace function search_normalize(t text) returns text
language sql immutable parallel safe as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

-- Product codes compare without punctuation: "TN-2420", "tn2420" and "TN 2420" all match.
create or replace function code_normalize(t text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]', '', 'g')
$$;

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
