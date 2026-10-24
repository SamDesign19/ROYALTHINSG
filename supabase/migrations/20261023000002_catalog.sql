-- Catalog: categories, brands, products, images, inventory, volume pricing.

create table categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references categories(id) on delete restrict,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        jsonb not null check (is_localized(name)),
  description jsonb check (description is null or is_localized(description)),
  image_path  text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  seo         jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on categories (parent_id);

create table brands (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  logo_path        text,
  makes_printers   boolean not null default false,  -- shown in "Find your ink"
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Optional grouping so colour / yield variants of one family link to each other.
create table product_groups (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       jsonb not null check (is_localized(name)),
  created_at timestamptz not null default now()
);

create table products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku             text not null unique,
  product_type    product_type not null,
  category_id     uuid not null references categories(id) on delete restrict,
  brand_id        uuid references brands(id) on delete restrict,
  group_id        uuid references product_groups(id) on delete set null,
  variant_label   jsonb check (variant_label is null or is_localized(variant_label)),
  name            jsonb not null check (is_localized(name)),
  short_description jsonb check (short_description is null or is_localized(short_description)),
  description     jsonb check (description is null or is_localized(description)),
  model_code      text,            -- cartridge / toner code, e.g. "057H", "TN-2420"
  oem_reference   text,            -- manufacturer part number, e.g. "3010C002"
  origin          product_origin,  -- original (OEM) or compatible; null for non-consumables
  color           ink_color,
  yield_type      yield_type,
  page_yield      int check (page_yield is null or page_yield > 0),
  volume_ml       numeric(8,2) check (volume_ml is null or volume_ml > 0),
  pack_size       int not null default 1 check (pack_size > 0),
  specs           jsonb not null default '{}',  -- free-form technical specifications
  price_dzd       numeric(12,2) check (price_dzd is null or price_dzd >= 0),  -- null = not sold online yet
  compare_at_dzd  numeric(12,2) check (compare_at_dzd is null or compare_at_dzd >= 0),
  status          product_status not null default 'draft',
  is_featured     boolean not null default false,
  weight_grams    int check (weight_grams is null or weight_grams > 0),
  model_3d_path   text,
  seo             jsonb not null default '{}',
  search_text     text not null default '',   -- maintained by trigger
  code_text       text not null default '',   -- maintained by trigger
  search_vector   tsvector,                   -- maintained by trigger
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (status <> 'active' or price_dzd is not null)  -- cannot sell without a real price
);
create index on products (category_id);
create index on products (brand_id);
create index on products (status, product_type);
create index on products (group_id);
create index products_search_vector_idx on products using gin (search_vector);
create index products_search_trgm_idx on products using gin (search_text extensions.gin_trgm_ops);
create index products_code_trgm_idx on products using gin (code_text extensions.gin_trgm_ops);

create table product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt          jsonb check (alt is null or is_localized(alt)),
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index on product_images (product_id, position);

create table inventory (
  product_id          uuid primary key references products(id) on delete cascade,
  quantity            int not null default 0 check (quantity >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  updated_at          timestamptz not null default now()
);

create table inventory_movements (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references products(id) on delete cascade,
  delta       int not null check (delta <> 0),
  quantity_after int not null,
  reason      stock_reason not null,
  order_id    uuid,              -- FK added in commerce migration
  note        text,
  created_by  uuid,              -- auth user id of the staff member, null for system
  created_at  timestamptz not null default now()
);
create index on inventory_movements (product_id, created_at desc);

-- Volume (B2B) pricing: the lowest applicable tier price wins.
create table price_tiers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  min_quantity  int not null check (min_quantity >= 2),
  price_dzd     numeric(12,2) not null check (price_dzd >= 0),
  business_only boolean not null default true,
  unique (product_id, min_quantity, business_only)
);

-- Every product gets an inventory row.
create or replace function products_after_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into inventory (product_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger products_inventory after insert on products
  for each row execute function products_after_insert();

-- Keep search columns in sync (names in every language, codes, brand).
create or replace function products_search_refresh() returns trigger
language plpgsql set search_path = public, extensions as $$
declare
  brand_name text;
begin
  select b.name into brand_name from brands b where b.id = new.brand_id;
  new.search_text := search_normalize(concat_ws(' ',
    new.name->>'ar', new.name->>'fr', new.name->>'en',
    new.variant_label->>'fr', new.variant_label->>'en', new.variant_label->>'ar',
    brand_name, new.model_code, new.oem_reference, new.sku));
  new.code_text := concat_ws(' ', code_normalize(new.model_code), code_normalize(new.oem_reference), code_normalize(new.sku));
  new.search_vector :=
       setweight(to_tsvector('simple', search_normalize(concat_ws(' ', new.model_code, new.oem_reference, new.sku))), 'A')
    || setweight(to_tsvector('simple', search_normalize(concat_ws(' ', new.name->>'ar', new.name->>'fr', new.name->>'en', brand_name))), 'B')
    || setweight(to_tsvector('simple', search_normalize(concat_ws(' ', new.short_description->>'fr', new.short_description->>'en', new.short_description->>'ar'))), 'C');
  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger products_search before insert or update on products
  for each row execute function products_search_refresh();

-- Renaming a brand refreshes its products' search text.
create or replace function brands_after_update() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.name is distinct from old.name then
    update products set updated_at = now() where brand_id = new.id;
  end if;
  return new;
end $$;
create trigger brands_refresh_products after update on brands
  for each row execute function brands_after_update();

create trigger categories_touch before update on categories for each row execute function touch_updated_at();
create trigger brands_touch before update on brands for each row execute function touch_updated_at();
create trigger products_touch before update on products for each row execute function touch_updated_at();
create trigger inventory_touch before update on inventory for each row execute function touch_updated_at();
