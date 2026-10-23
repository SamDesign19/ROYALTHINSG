-- Customers, business accounts, Algerian delivery geography and rates.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  role         user_role not null default 'customer',
  locale       text not null default 'ar' check (locale in ('ar', 'fr', 'en')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();

-- Create a profile for every new auth user.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table business_accounts (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references profiles(id) on delete cascade,
  company_name  text not null,
  activity      text,
  nif           text,   -- Numéro d'identification fiscale
  nis           text,   -- Numéro d'identification statistique
  rc            text,   -- Registre du commerce
  article_imposition text,
  billing_address text,
  status        business_status not null default 'pending',
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Wilayas are reference data; new administrative divisions can be added by admins.
create table wilayas (
  code       smallint primary key check (code between 1 and 99),
  name       jsonb not null check (is_localized(name)),
  is_active  boolean not null default true
);

-- Communes are imported from an official source (see docs/DATA.md); none are invented.
create table communes (
  id          serial primary key,
  wilaya_code smallint not null references wilayas(code),
  name        jsonb not null check (is_localized(name)),
  postal_code text,
  is_active   boolean not null default true,
  unique (wilaya_code, postal_code, name)
);
create index on communes (wilaya_code);

create table pickup_points (
  id          uuid primary key default gen_random_uuid(),
  wilaya_code smallint not null references wilayas(code),
  commune_id  int references communes(id),
  name        text not null,
  address     text not null,
  phone       text,
  opening_hours text,
  is_active   boolean not null default true
);

-- No rate row (or is_active = false) means the method is unavailable for that wilaya.
create table delivery_rates (
  wilaya_code  smallint not null references wilayas(code),
  method       delivery_method not null,
  fee_dzd      numeric(10,2) not null check (fee_dzd >= 0),
  free_over_dzd numeric(12,2) check (free_over_dzd is null or free_over_dzd > 0),
  eta_min_days smallint check (eta_min_days is null or eta_min_days >= 0),
  eta_max_days smallint check (eta_max_days is null or eta_max_days >= eta_min_days),
  is_active    boolean not null default true,
  primary key (wilaya_code, method)
);

create table addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  label        text,
  full_name    text not null,
  phone        text not null,
  wilaya_code  smallint not null references wilayas(code),
  commune_id   int references communes(id),
  address_line text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create unique index addresses_one_default on addresses (user_id) where is_default;

-- Algerian phone numbers: 0XXXXXXXXX or +213XXXXXXXXX (spaces, dots and dashes ignored).
create or replace function normalize_dz_phone(p text) returns text
language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p, ''), '[\s.\-()]', '', 'g');
begin
  if d ~ '^\+213[1-9][0-9]{7,8}$' then
    return '0' || substr(d, 5);
  elsif d ~ '^00213[1-9][0-9]{7,8}$' then
    return '0' || substr(d, 6);
  elsif d ~ '^0[1-9][0-9]{7,8}$' then
    return d;
  end if;
  return null;
end $$;
