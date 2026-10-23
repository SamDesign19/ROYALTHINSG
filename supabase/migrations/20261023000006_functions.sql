-- Business logic that must run on the server: authorisation helpers, order placement
-- (prices, stock and promotions are always recomputed here, never trusted from the client),
-- order status workflow, stock adjustments, search and analytics.

-- ---------------------------------------------------------------------------
-- Authorisation helpers
-- ---------------------------------------------------------------------------
create or replace function current_role_name() returns user_role
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select role from profiles where id = auth.uid()), 'customer'::user_role)
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('staff', 'admin'))
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function is_approved_business(p_user uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select p_user is not null and exists (
    select 1 from business_accounts where profile_id = p_user and status = 'approved')
$$;

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------
-- Unit price for a quantity, applying the best configured volume tier.
create or replace function unit_price(p_product uuid, p_quantity int, p_user uuid default auth.uid())
returns numeric
language sql stable security definer set search_path = public, extensions as $$
  select least(
    p.price_dzd,
    (select min(t.price_dzd) from price_tiers t
      where t.product_id = p.id and t.min_quantity <= p_quantity
        and (not t.business_only or is_approved_business(p_user))))
  from products p where p.id = p_product
$$;

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create or replace function apply_stock_change(
  p_product uuid, p_delta int, p_reason stock_reason, p_order uuid default null, p_note text default null)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  new_qty int;
begin
  update inventory set quantity = quantity + p_delta
   where product_id = p_product
   returning quantity into new_qty;
  if new_qty is null then
    raise exception 'unknown_product' using errcode = 'P0002';
  end if;
  insert into inventory_movements (product_id, delta, quantity_after, reason, order_id, note, created_by)
  values (p_product, p_delta, new_qty, p_reason, p_order, p_note, auth.uid());
  return new_qty;
exception when check_violation then
  raise exception 'insufficient_stock' using errcode = 'P0001';
end $$;
revoke all on function apply_stock_change(uuid, int, stock_reason, uuid, text) from public, anon, authenticated;

-- Staff stock adjustment from the admin dashboard.
create or replace function adjust_stock(p_product uuid, p_delta int, p_reason stock_reason, p_note text default null)
returns int
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason in ('sale', 'cancellation') then
    raise exception 'reason_reserved_for_orders' using errcode = '22023';
  end if;
  return apply_stock_change(p_product, p_delta, p_reason, null, p_note);
end $$;

-- ---------------------------------------------------------------------------
-- Order placement
-- ---------------------------------------------------------------------------
-- p_items:    [{"product_id": "...", "quantity": 2}, ...]
-- p_customer: {"name": "...", "phone": "...", "email": "...", "company": "..."}
-- p_delivery: {"method": "home"|"pickup", "wilaya_code": 19, "commune_id": 123,
--              "address_line": "...", "pickup_point_id": "..."}
-- Returns {"order_id", "order_number", "total_dzd", "guest_token"}.
create or replace function place_order(
  p_items jsonb, p_customer jsonb, p_delivery jsonb,
  p_promo_code text default null, p_note text default null, p_locale text default 'ar')
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user     uuid := auth.uid();
  v_guest    uuid := case when auth.uid() is null then gen_random_uuid() end;
  v_phone    text := normalize_dz_phone(p_customer->>'phone');
  v_name     text := nullif(btrim(p_customer->>'name'), '');
  v_method   delivery_method := (p_delivery->>'method')::delivery_method;
  v_wilaya   smallint := (p_delivery->>'wilaya_code')::smallint;
  v_commune  int := nullif(p_delivery->>'commune_id', '')::int;
  v_address  text := nullif(btrim(p_delivery->>'address_line'), '');
  v_pickup   uuid := nullif(p_delivery->>'pickup_point_id', '')::uuid;
  v_rate     delivery_rates%rowtype;
  v_promo    promo_codes%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_fee      numeric(12,2);
  v_order    uuid;
  v_number   text;
  r          record;
  v_price    numeric(12,2);
  v_count    int;
  v_distinct int;
begin
  -- Customer validation
  if v_name is null or length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if p_locale not in ('ar', 'fr', 'en') then
    p_locale := 'ar';
  end if;

  -- Items validation
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;
  select count(*), count(distinct (e->>'product_id')) into v_count, v_distinct
    from jsonb_array_elements(p_items) e;
  if v_count <> v_distinct then
    raise exception 'duplicate_items' using errcode = '22023';
  end if;

  -- Delivery validation
  select * into v_rate from delivery_rates dr
   join wilayas w on w.code = dr.wilaya_code and w.is_active
   where dr.wilaya_code = v_wilaya and dr.method = v_method and dr.is_active;
  if not found then
    raise exception 'delivery_unavailable' using errcode = '22023';
  end if;
  if v_commune is not null and not exists (
      select 1 from communes where id = v_commune and wilaya_code = v_wilaya and is_active) then
    raise exception 'invalid_commune' using errcode = '22023';
  end if;
  if v_method = 'home' then
    if v_address is null then
      raise exception 'address_required' using errcode = '22023';
    end if;
    v_pickup := null;
  else
    if not exists (select 1 from pickup_points where id = v_pickup and wilaya_code = v_wilaya and is_active) then
      raise exception 'invalid_pickup_point' using errcode = '22023';
    end if;
  end if;

  -- Lock stock rows in a stable order to avoid deadlocks, then price every line.
  if to_regclass('pg_temp._lines') is not null then
    drop table pg_temp._lines;
  end if;
  create temporary table _lines (
    product_id uuid primary key, sku text, name jsonb, quantity int, unit_price numeric(12,2)
  ) on commit drop;

  for r in
    select (e->>'product_id')::uuid as product_id, (e->>'quantity')::int as quantity
      from jsonb_array_elements(p_items) e
     order by 1
  loop
    if r.quantity is null or r.quantity < 1 or r.quantity > 999 then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
    perform 1 from inventory i where i.product_id = r.product_id for update;
    insert into _lines
    select p.id, p.sku, p.name, r.quantity, unit_price(p.id, r.quantity, v_user)
      from products p
      join inventory i on i.product_id = p.id
     where p.id = r.product_id and p.status = 'active' and p.price_dzd is not null;
    if not found then
      raise exception 'product_unavailable' using errcode = '22023', detail = r.product_id::text;
    end if;
    if (select quantity from inventory where product_id = r.product_id) < r.quantity then
      raise exception 'insufficient_stock' using errcode = 'P0001',
        detail = (select sku from products where id = r.product_id);
    end if;
  end loop;

  select sum(unit_price * quantity) into v_subtotal from _lines;

  -- Delivery fee
  v_fee := case when v_rate.free_over_dzd is not null and v_subtotal >= v_rate.free_over_dzd
                then 0 else v_rate.fee_dzd end;

  -- Promotion
  if nullif(btrim(p_promo_code), '') is not null then
    select * into v_promo from promo_codes
     where code = btrim(p_promo_code)::extensions.citext and is_active
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at > now())
     for update;
    if not found or (v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses) then
      raise exception 'invalid_promo_code' using errcode = '22023';
    end if;
    if v_subtotal < v_promo.min_subtotal_dzd then
      raise exception 'promo_minimum_not_met' using errcode = '22023';
    end if;
    if v_promo.per_customer_limit is not null and (
        select count(*) from orders o
         where o.promo_code_id = v_promo.id and o.status not in ('cancelled')
           and (o.customer_phone = v_phone or (v_user is not null and o.user_id = v_user))
       ) >= v_promo.per_customer_limit then
      raise exception 'promo_limit_reached' using errcode = '22023';
    end if;
    v_discount := case v_promo.kind
      when 'percent' then round(v_subtotal * v_promo.value / 100, 2)
      when 'fixed' then least(v_promo.value, v_subtotal)
      else 0 end;
    if v_promo.kind = 'free_shipping' then
      v_fee := 0;
    end if;
    update promo_codes set used_count = used_count + 1 where id = v_promo.id;
  end if;

  insert into orders (
    user_id, guest_token, customer_name, customer_phone, customer_email, company_name,
    delivery_method, wilaya_code, commune_id, address_line, pickup_point_id,
    subtotal_dzd, discount_dzd, delivery_fee_dzd, total_dzd, promo_code_id, customer_note, locale)
  values (
    v_user, v_guest, v_name, v_phone, nullif(btrim(p_customer->>'email'), ''),
    nullif(btrim(p_customer->>'company'), ''),
    v_method, v_wilaya, v_commune, case when v_method = 'home' then v_address end, v_pickup,
    v_subtotal, v_discount, v_fee, v_subtotal - v_discount + v_fee, v_promo.id,
    left(nullif(btrim(p_note), ''), 1000), p_locale)
  returning id, order_number into v_order, v_number;

  insert into order_items (order_id, product_id, sku, name, unit_price_dzd, quantity, line_total_dzd)
  select v_order, product_id, sku, name, unit_price, quantity, unit_price * quantity from _lines;

  for r in select product_id, quantity from _lines loop
    perform apply_stock_change(r.product_id, -r.quantity, 'sale', v_order, null);
  end loop;

  insert into order_status_history (order_id, status, changed_by) values (v_order, 'pending', v_user);

  -- Empty the signed-in customer's cart (guest carts are cleared by the server action).
  if v_user is not null then
    delete from cart_items ci using carts c where c.id = ci.cart_id and c.user_id = v_user;
  end if;

  return jsonb_build_object(
    'order_id', v_order, 'order_number', v_number,
    'total_dzd', v_subtotal - v_discount + v_fee, 'guest_token', v_guest);
end $$;

-- ---------------------------------------------------------------------------
-- Order status workflow
-- ---------------------------------------------------------------------------
create or replace function order_transition_allowed(p_from order_status, p_to order_status) returns boolean
language sql immutable as $$
  select (p_from, p_to) in (
    ('pending', 'confirmed'), ('pending', 'cancelled'),
    ('confirmed', 'processing'), ('confirmed', 'cancelled'),
    ('processing', 'shipped'), ('processing', 'cancelled'),
    ('shipped', 'delivered'), ('shipped', 'returned'),
    ('delivered', 'returned'))
$$;

create or replace function set_order_status(p_order uuid, p_status order_status, p_note text default null)
returns order_status
language plpgsql security definer set search_path = public, extensions as $$
declare
  o orders%rowtype;
  r record;
begin
  select * into o from orders where id = p_order for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  -- Customers may only cancel their own order while it is still pending.
  if not is_staff() then
    if not (o.user_id = auth.uid() and o.status = 'pending' and p_status = 'cancelled') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  if not order_transition_allowed(o.status, p_status) then
    raise exception 'invalid_transition' using errcode = '22023', detail = o.status || ' -> ' || p_status;
  end if;

  update orders set
    status = p_status,
    payment_status = case when p_status = 'delivered' and payment_method = 'cash_on_delivery'
                          then 'paid' else payment_status end,
    invoice_number = case when p_status = 'confirmed' and invoice_number is null
                          then 'F-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 6, '0')
                          else invoice_number end
  where id = p_order;

  -- Cancelling puts the goods back on the shelf and frees the promo use.
  if p_status = 'cancelled' then
    for r in select product_id, quantity from order_items where order_id = p_order and product_id is not null loop
      perform apply_stock_change(r.product_id, r.quantity, 'cancellation', p_order, null);
    end loop;
    if o.promo_code_id is not null then
      update promo_codes set used_count = greatest(used_count - 1, 0) where id = o.promo_code_id;
    end if;
  end if;
  -- Returned goods are NOT restocked automatically: staff inspect them and use adjust_stock().

  insert into order_status_history (order_id, status, note, changed_by)
  values (p_order, p_status, p_note, auth.uid());
  return p_status;
end $$;

-- Guest order lookup (order number + phone, or the guest token kept in a cookie).
create or replace function find_guest_order(p_order_number text, p_phone text)
returns table (order_number text, status order_status, total_dzd numeric, created_at timestamptz, history jsonb)
language sql stable security definer set search_path = public, extensions as $$
  select o.order_number, o.status, o.total_dzd, o.created_at,
         (select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) order by h.created_at)
            from order_status_history h where h.order_id = o.id)
    from orders o
   where o.order_number = upper(btrim(p_order_number))
     and o.customer_phone = normalize_dz_phone(p_phone)
$$;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------
create or replace function category_tree(p_slug text) returns setof uuid
language sql stable set search_path = public as $$
  with recursive t as (
    select id from categories where slug = p_slug and is_active
    union all
    select c.id from categories c join t on c.parent_id = t.id where c.is_active
  ) select id from t
$$;

create or replace function search_products(
  p_query      text default null,
  p_category   text default null,
  p_brands     text[] default null,
  p_types      product_type[] default null,
  p_colors     ink_color[] default null,
  p_origin     product_origin default null,
  p_min_price  numeric default null,
  p_max_price  numeric default null,
  p_in_stock   boolean default false,
  p_printer    uuid default null,
  p_sort       text default 'relevance',   -- relevance | popular | newest | price_asc | price_desc
  p_limit      int default 24,
  p_offset     int default 0)
returns table (
  id uuid, slug text, sku text, name jsonb, model_code text, product_type product_type,
  origin product_origin, color ink_color, yield_type yield_type, page_yield int, volume_ml numeric,
  price_dzd numeric, compare_at_dzd numeric, brand_name text, brand_slug text, image_path text,
  in_stock boolean, low_stock boolean, rank real, total_count bigint)
language plpgsql stable set search_path = public, extensions as $$
#variable_conflict use_column
declare
  qn text := nullif(search_normalize(btrim(p_query)), '');
  qc text := code_normalize(p_query);
  tsq tsquery;
begin
  if qn is not null then
    tsq := websearch_to_tsquery('simple', qn);
  end if;
  p_limit := least(greatest(coalesce(p_limit, 24), 1), 100);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  return query
  with printer_hits as (
    -- Searching a printer model returns its verified supplies.
    select distinct pc.product_id
      from printers pr join product_compatibility pc on pc.printer_id = pr.id and pc.verified
     where qn is not null and length(qc) >= 3 and pr.is_active and pr.model_norm like '%' || qc || '%'
  ),
  sales as (
    select oi.product_id, sum(oi.quantity) as sold
      from order_items oi join orders o on o.id = oi.order_id
     where o.status not in ('cancelled') and o.created_at > now() - interval '90 days'
     group by oi.product_id
  ),
  base as (
    select p.*, b.name as b_name, b.slug as b_slug, i.quantity as stock, i.low_stock_threshold,
           case when qn is null then 0::real else (
               coalesce(ts_rank(p.search_vector, tsq), 0)
             + case when length(qc) >= 3 and p.code_text like '%' || qc || '%' then 1.5 else 0 end
             + case when p.id in (select product_id from printer_hits) then 1.0 else 0 end
             + word_similarity(qn, p.search_text))::real end as score,
           coalesce(s.sold, 0) as sold
      from products p
      left join brands b on b.id = p.brand_id
      join inventory i on i.product_id = p.id
      left join sales s on s.product_id = p.id
     where p.status = 'active'
       and (qn is null
            or p.search_vector @@ tsq
            or (length(qc) >= 3 and p.code_text like '%' || qc || '%')
            or p.id in (select product_id from printer_hits)
            or word_similarity(qn, p.search_text) >= 0.5)
       and (p_category is null or p.category_id in (select category_tree(p_category)))
       and (p_brands is null or b.slug = any (p_brands))
       and (p_types is null or p.product_type = any (p_types))
       and (p_colors is null or p.color = any (p_colors))
       and (p_origin is null or p.origin = p_origin)
       and (p_min_price is null or p.price_dzd >= p_min_price)
       and (p_max_price is null or p.price_dzd <= p_max_price)
       and (not coalesce(p_in_stock, false) or i.quantity > 0)
       and (p_printer is null or exists (
             select 1 from product_compatibility pc
              where pc.product_id = p.id and pc.printer_id = p_printer and pc.verified))
  )
  select b.id, b.slug, b.sku, b.name, b.model_code, b.product_type, b.origin, b.color, b.yield_type,
         b.page_yield, b.volume_ml, b.price_dzd, b.compare_at_dzd, b.b_name, b.b_slug,
         (select pi.storage_path from product_images pi where pi.product_id = b.id order by pi.position limit 1),
         b.stock > 0, b.stock > 0 and b.stock <= b.low_stock_threshold, b.score,
         count(*) over ()
    from base b
   order by
     case when p_sort = 'price_asc' then b.price_dzd end asc nulls last,
     case when p_sort = 'price_desc' then b.price_dzd end desc nulls last,
     case when p_sort = 'newest' then b.published_at end desc nulls last,
     case when p_sort = 'popular' then b.sold end desc,
     case when p_sort = 'relevance' then b.score end desc,
     b.is_featured desc, b.sold desc, b.published_at desc nulls last, b.id
   limit p_limit offset p_offset;
end $$;

-- Autocomplete: a few products, printer models and categories for the search box.
create or replace function search_suggestions(p_query text, p_limit int default 6)
returns jsonb
language plpgsql stable set search_path = public, extensions as $$
declare
  qn text := search_normalize(btrim(p_query));
  qc text := code_normalize(p_query);
begin
  if length(qn) < 2 then
    return jsonb_build_object('products', '[]'::jsonb, 'printers', '[]'::jsonb, 'categories', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'model_code', s.model_code,
                                          'price_dzd', s.price_dzd, 'image_path', s.image_path))
        from search_products(p_query => p_query, p_limit => p_limit) s), '[]'::jsonb),
    'printers', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('id', pr.id, 'slug', pr.slug, 'model', pr.model, 'brand', b.name) as x
          from printers pr join brands b on b.id = pr.brand_id
         where pr.is_active and (pr.model_norm like '%' || qc || '%'
                                 or word_similarity(qn, search_normalize(b.name || ' ' || pr.model)) >= 0.5)
         order by similarity(pr.model_norm, qc) desc, pr.model
         limit p_limit) t), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('slug', c.slug, 'name', c.name) as x
          from categories c
         where c.is_active and word_similarity(qn, search_normalize(concat_ws(' ', c.name->>'ar', c.name->>'fr', c.name->>'en'))) >= 0.5
         limit 3) t), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- Admin analytics (real data only; empty until orders exist)
-- ---------------------------------------------------------------------------
create or replace view admin_daily_sales with (security_invoker = true) as
select date_trunc('day', o.created_at at time zone 'Africa/Algiers')::date as day,
       count(*) as orders,
       count(*) filter (where o.status = 'cancelled') as cancelled,
       sum(o.total_dzd) filter (where o.status not in ('cancelled', 'returned')) as revenue_dzd
  from orders o
 where is_staff()
 group by 1;

create or replace view admin_best_sellers with (security_invoker = true) as
select oi.product_id, oi.sku, max(oi.name::text)::jsonb as name,
       sum(oi.quantity) as units, sum(oi.line_total_dzd) as revenue_dzd
  from order_items oi join orders o on o.id = oi.order_id
 where is_staff() and o.status not in ('cancelled', 'returned')
 group by oi.product_id, oi.sku;

create or replace view admin_stock_alerts with (security_invoker = true) as
select p.id as product_id, p.sku, p.name, p.status, i.quantity, i.low_stock_threshold,
       case when i.quantity = 0 then 'out_of_stock' else 'low_stock' end as alert
  from products p join inventory i on i.product_id = p.id
 where is_staff() and p.status <> 'archived' and i.quantity <= i.low_stock_threshold;
