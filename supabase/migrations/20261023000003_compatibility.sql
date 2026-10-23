-- Printer compatibility engine: brand -> series -> model, and a verified
-- many-to-many relation between printers and supply products.

create table printer_series (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references brands(id) on delete restrict,
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,                -- e.g. "i-SENSYS MF440", "EcoTank"
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table printers (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete restrict,
  series_id   uuid references printer_series(id) on delete set null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  model       text not null,               -- e.g. "i-SENSYS MF443dw"
  kind        printer_kind not null default 'other',
  product_id  uuid unique references products(id) on delete set null,  -- when the printer itself is sold
  is_active   boolean not null default true,
  model_norm  text generated always as (regexp_replace(lower(model), '[^a-z0-9]', '', 'g')) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (brand_id, model)
);
create index on printers (series_id);
create index printers_model_trgm_idx on printers using gin (model_norm extensions.gin_trgm_ops);

-- Only rows with verified = true are ever shown to customers.
create table product_compatibility (
  product_id  uuid not null references products(id) on delete cascade,
  printer_id  uuid not null references printers(id) on delete cascade,
  verified    boolean not null default false,
  source      text,                         -- where the information comes from (OEM datasheet, test, supplier)
  verified_by uuid,                         -- staff auth user id
  verified_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (product_id, printer_id),
  check (not verified or verified_at is not null)
);
create index on product_compatibility (printer_id) where verified;

create trigger printers_touch before update on printers for each row execute function touch_updated_at();

-- Verified, sellable supplies for one printer.
create or replace view printer_supplies with (security_invoker = true) as
select pc.printer_id, p.*
from product_compatibility pc
join products p on p.id = pc.product_id
where pc.verified and p.status = 'active';

-- Verified printers for one product (reverse lookup on product pages).
create or replace view product_printers with (security_invoker = true) as
select pc.product_id, pr.id as printer_id, pr.slug, pr.model, pr.kind,
       b.id as brand_id, b.name as brand_name, s.id as series_id, s.name as series_name
from product_compatibility pc
join printers pr on pr.id = pc.printer_id and pr.is_active
join brands b on b.id = pr.brand_id
left join printer_series s on s.id = pr.series_id
where pc.verified;
