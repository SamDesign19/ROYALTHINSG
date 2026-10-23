-- Carts, wishlists, promotions, orders, returns, quotations, reviews, marketing.

-- Carts: one per signed-in user, or one per guest token (httpOnly cookie, server-side only).
create table carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references profiles(id) on delete cascade,
  guest_token uuid unique,
  updated_at  timestamptz not null default now(),
  check ((user_id is null) <> (guest_token is null))
);

create table cart_items (
  cart_id    uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity   int not null check (quantity between 1 and 999),
  added_at   timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create table wishlist_items (
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          extensions.citext not null unique,
  kind          promo_kind not null,
  value         numeric(12,2) not null default 0 check (value >= 0),
  min_subtotal_dzd numeric(12,2) not null default 0,
  max_uses      int check (max_uses is null or max_uses > 0),
  used_count    int not null default 0,
  per_customer_limit int check (per_customer_limit is null or per_customer_limit > 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create sequence order_number_seq start 1000;
create sequence invoice_number_seq start 1;

create table orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique default ('RI-' || nextval('order_number_seq')),
  user_id         uuid references profiles(id) on delete set null,
  guest_token     uuid,                       -- lets a guest view their own order
  status          order_status not null default 'pending',
  payment_method  payment_method not null default 'cash_on_delivery',
  payment_status  payment_status not null default 'unpaid',
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  company_name    text,
  delivery_method delivery_method not null,
  wilaya_code     smallint not null references wilayas(code),
  commune_id      int references communes(id),
  address_line    text,
  pickup_point_id uuid references pickup_points(id),
  subtotal_dzd    numeric(12,2) not null,
  discount_dzd    numeric(12,2) not null default 0,
  delivery_fee_dzd numeric(12,2) not null,
  total_dzd       numeric(12,2) not null,
  promo_code_id   uuid references promo_codes(id),
  customer_note   text,
  internal_note   text,
  locale          text not null default 'ar',
  invoice_number  text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (total_dzd = subtotal_dzd - discount_dzd + delivery_fee_dzd),
  check (delivery_method <> 'home' or address_line is not null),
  check (delivery_method <> 'pickup' or pickup_point_id is not null)
);
create index on orders (user_id, created_at desc);
create index on orders (status, created_at desc);
create trigger orders_touch before update on orders for each row execute function touch_updated_at();

alter table inventory_movements
  add constraint inventory_movements_order_fk foreign key (order_id) references orders(id) on delete set null;

create table order_items (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  sku           text not null,
  name          jsonb not null,             -- snapshot at purchase time
  unit_price_dzd numeric(12,2) not null,
  quantity      int not null check (quantity > 0),
  line_total_dzd numeric(12,2) not null,
  check (line_total_dzd = unit_price_dzd * quantity)
);
create index on order_items (order_id);
create index on order_items (product_id);

create table order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  note       text,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index on order_status_history (order_id, created_at);

create table return_requests (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  items       jsonb not null,               -- [{order_item_id, quantity}]
  reason      text not null,
  status      return_status not null default 'requested',
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger return_requests_touch before update on return_requests for each row execute function touch_updated_at();

-- B2B quotations.
create table quote_requests (
  id             uuid primary key default gen_random_uuid(),
  quote_number   text not null unique default ('Q-' || to_char(now(), 'YYMM') || '-' || substr(md5(random()::text), 1, 6)),
  user_id        uuid references profiles(id) on delete set null,
  company_name   text not null,
  contact_name   text not null,
  email          text,
  phone          text not null,
  wilaya_code    smallint references wilayas(code),
  message        text,
  status         quote_status not null default 'new',
  quoted_total_dzd numeric(12,2),
  valid_until    date,
  admin_note     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger quote_requests_touch before update on quote_requests for each row execute function touch_updated_at();

create table quote_request_items (
  id            bigint generated always as identity primary key,
  quote_id      uuid not null references quote_requests(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  description   text,                       -- free text when the product is not in the catalog
  quantity      int not null check (quantity > 0),
  quoted_unit_price_dzd numeric(12,2),
  check (product_id is not null or description is not null)
);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  title       text,
  body        text,
  status      review_status not null default 'pending',
  verified_purchase boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);

-- Marketing.
create table banners (
  id         uuid primary key default gen_random_uuid(),
  placement  text not null default 'home_hero',
  title      jsonb not null check (is_localized(title)),
  subtitle   jsonb check (subtitle is null or is_localized(subtitle)),
  cta_label  jsonb check (cta_label is null or is_localized(cta_label)),
  cta_href   text,
  image_path text not null,
  sort_order int not null default 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean not null default true
);

create table collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       jsonb not null check (is_localized(title)),
  description jsonb check (description is null or is_localized(description)),
  image_path  text,
  show_on_home boolean not null default false,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  position      int not null default 0,
  primary key (collection_id, product_id)
);

-- Store-wide settings, e.g. {"reviews_enabled": false}.
create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
