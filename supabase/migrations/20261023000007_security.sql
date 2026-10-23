-- Row Level Security. Principles:
--  * anon/authenticated can read only what a shopper should see (active, verified, own data).
--  * Orders and quotations are created only through SECURITY DEFINER functions that
--    validate everything server-side; there is no direct INSERT grant.
--  * Staff manage the catalog and orders; only admins change roles and settings.
--  * The service role (used only in server code) bypasses RLS, e.g. for guest carts.

-- Search runs with definer rights so it can use stock and sales without exposing them.
alter function search_products(text, text, text[], product_type[], ink_color[], product_origin,
  numeric, numeric, boolean, uuid, text, int, int) security definer;
alter function search_suggestions(text, int) security definer;

-- Enable RLS on every table in public.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog (public read, staff write)
-- ---------------------------------------------------------------------------
create policy "public read" on categories for select using (is_active or is_staff());
create policy "public read" on brands for select using (is_active or is_staff());
create policy "public read" on product_groups for select using (true);
create policy "public read" on products for select using (status = 'active' or is_staff());
create policy "public read" on product_images for select
  using (exists (select 1 from products p where p.id = product_id and (p.status = 'active' or is_staff())));
create policy "public read" on price_tiers for select
  using (exists (select 1 from products p where p.id = product_id and (p.status = 'active' or is_staff())));
create policy "public read" on printer_series for select using (is_active or is_staff());
create policy "public read" on printers for select using (is_active or is_staff());
create policy "public read verified" on product_compatibility for select using (verified or is_staff());
create policy "public read" on banners for select
  using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or is_staff());
create policy "public read" on collections for select using (is_active or is_staff());
create policy "public read" on collection_products for select using (true);
create policy "public read" on settings for select using (true);
create policy "public read" on wilayas for select using (is_active or is_staff());
create policy "public read" on communes for select using (is_active or is_staff());
create policy "public read" on pickup_points for select using (is_active or is_staff());
create policy "public read" on delivery_rates for select using (is_active or is_staff());

create policy "staff write" on categories for all using (is_staff()) with check (is_staff());
create policy "staff write" on brands for all using (is_staff()) with check (is_staff());
create policy "staff write" on product_groups for all using (is_staff()) with check (is_staff());
create policy "staff write" on products for all using (is_staff()) with check (is_staff());
create policy "staff write" on product_images for all using (is_staff()) with check (is_staff());
create policy "staff write" on price_tiers for all using (is_staff()) with check (is_staff());
create policy "staff write" on printer_series for all using (is_staff()) with check (is_staff());
create policy "staff write" on printers for all using (is_staff()) with check (is_staff());
create policy "staff write" on product_compatibility for all using (is_staff()) with check (is_staff());
create policy "staff write" on banners for all using (is_staff()) with check (is_staff());
create policy "staff write" on collections for all using (is_staff()) with check (is_staff());
create policy "staff write" on collection_products for all using (is_staff()) with check (is_staff());
create policy "staff write" on pickup_points for all using (is_staff()) with check (is_staff());
create policy "staff write" on delivery_rates for all using (is_staff()) with check (is_staff());
create policy "staff write" on communes for all using (is_staff()) with check (is_staff());
create policy "admin write" on wilayas for all using (is_admin()) with check (is_admin());
create policy "admin write" on settings for all using (is_admin()) with check (is_admin());

-- Stock is internal; shoppers see availability through product_availability().
create policy "staff only" on inventory for all using (is_staff()) with check (is_staff());
create policy "staff read" on inventory_movements for select using (is_staff());
create policy "staff only" on promo_codes for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create policy "own profile" on profiles for select using (id = auth.uid() or is_staff());
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Customers may only change these columns (never their role).
revoke update on profiles from anon, authenticated;
grant update (full_name, phone, locale) on profiles to authenticated;

create policy "own business" on business_accounts for select using (profile_id = auth.uid() or is_staff());
create policy "own business insert" on business_accounts for insert with check (profile_id = auth.uid());
create policy "staff review" on business_accounts for update using (is_staff()) with check (is_staff());
revoke insert, update on business_accounts from anon, authenticated;
grant insert (profile_id, company_name, activity, nif, nis, rc, article_imposition, billing_address)
  on business_accounts to authenticated;
grant update (status, reviewed_by, reviewed_at, company_name, activity, nif, nis, rc, article_imposition, billing_address)
  on business_accounts to authenticated;  -- the policy limits updates to staff

create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart" on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart items" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "own wishlist" on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Orders (created only by place_order)
-- ---------------------------------------------------------------------------
create policy "own orders" on orders for select using (user_id = auth.uid() or is_staff());
create policy "staff update" on orders for update using (is_staff()) with check (is_staff());
revoke insert, delete on orders from anon, authenticated;
revoke update on orders from anon, authenticated;
grant update (internal_note) on orders to authenticated;  -- staff policy applies; status changes use set_order_status()

create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
create policy "own order history" on order_status_history for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
revoke insert, update, delete on order_items, order_status_history from anon, authenticated;

create policy "own returns" on return_requests for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
create policy "request return" on return_requests for insert
  with check (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'delivered'));
create policy "staff returns" on return_requests for update using (is_staff()) with check (is_staff());
revoke insert, update on return_requests from anon, authenticated;
grant insert (order_id, items, reason) on return_requests to authenticated;
grant update (status, admin_note) on return_requests to authenticated;  -- staff policy applies

-- Quotations: created through submit_quote(); readable by owner and staff.
create policy "own quotes" on quote_requests for select using (user_id = auth.uid() or is_staff());
create policy "staff quotes" on quote_requests for update using (is_staff()) with check (is_staff());
create policy "own quote items" on quote_request_items for select
  using (exists (select 1 from quote_requests q where q.id = quote_id and (q.user_id = auth.uid() or is_staff())));
create policy "staff quote items" on quote_request_items for update using (is_staff()) with check (is_staff());
revoke insert, delete on quote_requests, quote_request_items from anon, authenticated;

-- Reviews: shown once approved and only while reviews are enabled.
create policy "public approved" on reviews for select
  using ((status = 'approved' and coalesce((select (value)::boolean from settings where key = 'reviews_enabled'), false))
         or user_id = auth.uid() or is_staff());
create policy "write own review" on reviews for insert with check (user_id = auth.uid());
create policy "staff moderate" on reviews for update using (is_staff()) with check (is_staff());
create policy "staff delete" on reviews for delete using (is_staff() or user_id = auth.uid());
revoke insert, update on reviews from anon, authenticated;
grant insert (product_id, user_id, rating, title, body) on reviews to authenticated;
grant update (status) on reviews to authenticated;  -- staff policy applies

-- ---------------------------------------------------------------------------
-- Secure entry points
-- ---------------------------------------------------------------------------

-- Public stock status without exposing exact quantities.
create or replace function product_availability(p_ids uuid[])
returns table (product_id uuid, in_stock boolean, low_stock boolean)
language sql stable security definer set search_path = public, extensions as $$
  select i.product_id, i.quantity > 0, i.quantity > 0 and i.quantity <= i.low_stock_threshold
    from inventory i join products p on p.id = i.product_id and p.status = 'active'
   where i.product_id = any (p_ids)
$$;

-- B2B quotation request (works for guests and signed-in customers).
-- p_quote: {"company_name","contact_name","email","phone","wilaya_code","message"}
-- p_items: [{"product_id": "..."} or {"description": "..."}, "quantity": n]
create or replace function submit_quote(p_quote jsonb, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_number text;
  v_phone text := normalize_dz_phone(p_quote->>'phone');
begin
  if nullif(btrim(p_quote->>'company_name'), '') is null or nullif(btrim(p_quote->>'contact_name'), '') is null then
    raise exception 'company_and_contact_required' using errcode = '22023';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;
  insert into quote_requests (user_id, company_name, contact_name, email, phone, wilaya_code, message)
  values (auth.uid(), left(btrim(p_quote->>'company_name'), 200), left(btrim(p_quote->>'contact_name'), 120),
          nullif(btrim(p_quote->>'email'), ''), v_phone, nullif(p_quote->>'wilaya_code', '')::smallint,
          left(nullif(btrim(p_quote->>'message'), ''), 4000))
  returning id, quote_number into v_id, v_number;

  insert into quote_request_items (quote_id, product_id, description, quantity)
  select v_id,
         (select p.id from products p where p.id = nullif(e->>'product_id', '')::uuid and p.status = 'active'),
         left(nullif(btrim(e->>'description'), ''), 500),
         (e->>'quantity')::int
    from jsonb_array_elements(p_items) e;
  return jsonb_build_object('quote_id', v_id, 'quote_number', v_number);
exception
  when check_violation or not_null_violation or invalid_text_representation then
    raise exception 'invalid_items' using errcode = '22023';
end $$;

-- Role changes (admin only).
create or replace function set_user_role(p_user uuid, p_role user_role)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot_demote_self' using errcode = '22023';
  end if;
  update profiles set role = p_role where id = p_user;
end $$;

-- Execute permissions.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  is_localized(jsonb), search_normalize(text), code_normalize(text), normalize_dz_phone(text),
  current_role_name(), is_staff(), is_admin(), unit_price(uuid, int, uuid),
  place_order(jsonb, jsonb, jsonb, text, text, text),
  set_order_status(uuid, order_status, text), find_guest_order(text, text),
  category_tree(text),
  search_products(text, text, text[], product_type[], ink_color[], product_origin, numeric, numeric, boolean, uuid, text, int, int),
  search_suggestions(text, int), product_availability(uuid[]), submit_quote(jsonb, jsonb),
  order_transition_allowed(order_status, order_status), is_approved_business(uuid)
  to anon, authenticated;
grant execute on function adjust_stock(uuid, int, stock_reason, text), set_user_role(uuid, user_role)
  to authenticated;
