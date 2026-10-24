-- Checkout: server-side pricing, stock, delivery, promotions, status workflow.
\set QUIET on
\set customer '{"name": "Amina B.", "phone": "+213 555 12 34 56"}'
\set home19 '{"method": "home", "wilaya_code": 19, "commune_id": 900002, "address_line": "Cité 100 logements"}'

-- Guest order: 2 x Canon 057H at 18 000 + 400 delivery to Sétif.
set role anon;
select test.login(null);
create temp table r as select place_order(
  '[{"product_id": "40000000-0000-0000-0000-000000000001", "quantity": 2, "price_dzd": 1}]',
  :'customer', :'home19', null, 'please call first', 'fr') as res;
grant select on r to authenticated;  -- test bookkeeping: later steps look up this order number
select test.ok((select (res->>'total_dzd')::numeric from r) = 36400, 'guest total = 2 x 18000 + 400 (client price ignored)');
select test.ok((select res->>'order_number' from r) like 'RI-%', 'order number issued');
select test.ok((select res->>'guest_token' from r) is not null, 'guest gets a token to track the order');
select test.ok((select count(*) from orders) = 0, 'guest still cannot list orders directly');
select test.ok((select status from find_guest_order((select res->>'order_number' from r), '0555123456')) = 'pending',
  'guest order lookup by number + phone (any phone format)');
select test.ok(not exists (select 1 from find_guest_order((select res->>'order_number' from r), '0666000000')),
  'wrong phone reveals nothing');

select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000002", "quantity": 4}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}')$$,
  'insufficient_stock', 'cannot buy more than stock');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000005", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}')$$,
  'product_unavailable', 'draft products cannot be ordered');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "12345"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}')$$,
  'invalid_phone', 'phone number is validated');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 11, "address_line": "x"}')$$,
  'delivery_unavailable', 'wilaya without a configured rate is refused');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "commune_id": 900003, "address_line": "x"}')$$,
  'invalid_commune', 'commune must belong to the wilaya');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19}')$$,
  'address_required', 'home delivery needs an address');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1},
  {"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "pickup", "wilaya_code": 19, "pickup_point_id": "50000000-0000-0000-0000-000000000001"}')$$,
  'duplicate_items', 'duplicate lines are refused');
select test.raises($$select place_order('[]', '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}')$$,
  'empty_cart', 'empty cart is refused');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}', 'NOPE')$$,
  'invalid_promo_code', 'unknown promo code is refused');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}', 'BIG')$$,
  'promo_minimum_not_met', 'promo minimum subtotal is enforced');
reset role;
select test.ok((select quantity from inventory where product_id = '40000000-0000-0000-0000-000000000001') = 8, 'stock decremented 10 -> 8');
select test.ok((select quantity from inventory where product_id = '40000000-0000-0000-0000-000000000002') = 3, 'failed order left stock untouched');
select test.ok((select count(*) from inventory_movements where reason = 'sale') = 1, 'sale movement logged');
select test.ok((select customer_phone from orders limit 1) = '0555123456', 'phone stored normalised');

-- Signed-in customer: pickup, percent promo, cart cleared.
set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000c');
insert into carts (user_id) values (auth.uid());
insert into cart_items (cart_id, product_id, quantity) select id, '40000000-0000-0000-0000-000000000004', 3 from carts;
create temp table r2 as select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 3}]',
  '{"name": "Customer", "phone": "0661 22 33 44"}',
  '{"method": "pickup", "wilaya_code": 19, "pickup_point_id": "50000000-0000-0000-0000-000000000001"}', 'welcome10') as res;
select test.ok((select (res->>'total_dzd')::numeric from r2) = 4860, 'pickup + 10% promo: 5400 - 540 + 0');
select test.ok((select count(*) from orders) = 1, 'customer sees exactly their own order');
select test.ok((select count(*) from order_items) = 1, 'customer sees their order lines');
select test.ok((select count(*) from cart_items) = 0, 'cart emptied after checkout');
select test.ok((select unit_price_dzd from order_items) = 1800, 'no business tier for a regular customer at qty 3');
select test.raises($$select set_order_status((select id from orders), 'confirmed')$$, 'forbidden', 'customer cannot confirm');
select set_order_status((select id from orders), 'cancelled', 'changed my mind');
select test.ok((select status from orders) = 'cancelled', 'customer can cancel a pending order');
reset role;
select test.ok((select quantity from inventory where product_id = '40000000-0000-0000-0000-000000000004') = 50, 'cancellation restocked 3 bottles');
select test.ok((select used_count from promo_codes where code = 'WELCOME10') = 0, 'cancellation released the promo use');

-- Other customer cannot see or cancel someone else's order.
set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000e');
select test.ok((select count(*) from orders) = 0, 'other customer sees no foreign orders');
select test.raises($$select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'cancelled')$$,
  'order_not_found', 'cannot touch an order you cannot see');

-- Business customer gets the volume tier (10+ bottles at 1500). Free-shipping code is single-use.
select test.login('00000000-0000-0000-0000-00000000000d');
create temp table r3 as select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 10}]',
  '{"name": "Test SARL", "phone": "0550 00 00 01", "company": "Test SARL"}', :'home19', 'SHIPFREE') as res;
select test.ok((select (res->>'total_dzd')::numeric from r3) = 15000, 'business tier 10 x 1500 and free shipping');
select test.raises($$select place_order('[{"product_id": "40000000-0000-0000-0000-000000000004", "quantity": 1}]',
  '{"name": "x", "phone": "0555000000"}', '{"method": "home", "wilaya_code": 19, "address_line": "x"}', 'SHIPFREE')$$,
  'invalid_promo_code', 'max_uses is enforced');

-- Staff workflow.
select test.login('00000000-0000-0000-0000-00000000000b');
select test.ok((select count(*) from orders) = 3, 'staff sees all orders');
select test.raises($$select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'delivered')$$,
  'invalid_transition', 'cannot skip from pending to delivered');
select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'confirmed');
select test.ok((select invoice_number from orders where order_number = (select res->>'order_number' from r)) like 'F-%', 'invoice number assigned on confirmation');
select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'processing');
select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'shipped');
select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'delivered', 'COD collected');
select test.ok((select payment_status from orders where order_number = (select res->>'order_number' from r)) = 'paid', 'delivery marks COD as paid');
select test.ok((select count(*) from order_status_history h join orders o on o.id = h.order_id
  where o.order_number = (select res->>'order_number' from r)) = 5, 'full status history kept');
select test.raises($$select set_order_status((select id from orders where order_number = (select res->>'order_number' from r)), 'cancelled')$$,
  'invalid_transition', 'delivered orders cannot be cancelled');

-- Analytics reflect real orders only (cancelled excluded from revenue).
select test.ok((select sum(revenue_dzd) from admin_daily_sales) = 36400 + 15000, 'revenue = non-cancelled order totals');
select test.ok((select sum(cancelled) from admin_daily_sales) = 1, 'cancelled orders counted separately');
select test.ok((select units from admin_best_sellers where sku = 'GI41C') = 10, 'best sellers exclude the cancelled order');
select test.ok((select count(*) from admin_stock_alerts where sku = 'CF259A' and alert = 'out_of_stock') = 1, 'out-of-stock alert');
select test.ok((select count(*) from admin_stock_alerts where sku = 'RI-057H' and alert = 'low_stock') = 1, 'low-stock alert');
reset role;
