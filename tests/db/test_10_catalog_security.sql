-- Shoppers only see active products, verified compatibility, and never raw stock.
\set QUIET on
set role anon;
select test.login(null);
select test.ok((select count(*) from products) = 4, 'anon sees the 4 active products, not the draft');
select test.ok((select count(*) from inventory) = 0, 'anon cannot read stock quantities');
select test.ok((select count(*) from product_compatibility) = 3, 'anon sees only verified compatibility rows');
select test.ok(not exists (select 1 from product_printers where product_id = '40000000-0000-0000-0000-000000000003'),
  'unverified HP 59A -> MF443dw link is hidden on the product page');
select test.ok((select count(*) from product_printers where product_id = '40000000-0000-0000-0000-000000000001') = 2,
  'reverse lookup: Canon 057H lists its 2 verified printers');
select test.ok((select count(*) from printer_supplies where printer_id = '30000000-0000-0000-0000-000000000001') = 2,
  'printer finder: MF443dw has 2 verified supplies');
select test.ok((select in_stock from product_availability(array['40000000-0000-0000-0000-000000000003'::uuid])) = false,
  'availability shows HP 59A out of stock');
select test.ok((select low_stock from product_availability(array['40000000-0000-0000-0000-000000000002'::uuid])),
  'availability flags low stock without revealing the quantity');
select test.raises($$insert into products (slug, sku, product_type, category_id, name, status)
  values ('x', 'X', 'toner', (select id from categories limit 1), '{"fr":"x"}', 'draft')$$,
  'row-level security', 'anon cannot create products');
select test.ok((select count(*) from orders) = 0, 'anon reads no orders');
select test.ok((select count(*) from promo_codes) = 0, 'promo codes are not public');
select test.ok((select count(*) from admin_daily_sales) = 0, 'analytics are not visible to anon');

set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000c');
select test.raises($$update profiles set role = 'admin' where id = auth.uid()$$, 'permission denied', 'customer cannot promote themselves');
update profiles set full_name = 'Test Customer' where id = auth.uid();
select test.ok((select full_name from profiles where id = auth.uid()) = 'Test Customer', 'customer can edit own name');
select test.ok((select count(*) from profiles) = 1, 'customer sees only own profile');
select test.raises($$select set_user_role('00000000-0000-0000-0000-00000000000c', 'admin')$$, 'forbidden', 'customer cannot call set_user_role');
select test.raises($$select adjust_stock('40000000-0000-0000-0000-000000000001', 5, 'adjustment')$$, 'forbidden', 'customer cannot adjust stock');
select test.raises($$select apply_stock_change('40000000-0000-0000-0000-000000000001', 5, 'adjustment')$$, 'permission denied', 'internal stock function is not callable');
select test.raises($$insert into orders (customer_name, customer_phone, delivery_method, wilaya_code, address_line, subtotal_dzd, delivery_fee_dzd, total_dzd)
  values ('x', '0555000000', 'home', 19, 'x', 0, 0, 0)$$, 'permission denied', 'orders cannot be inserted directly');

set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000b');
select test.ok((select count(*) from products) = 5, 'staff sees drafts too');
select test.ok((select count(*) from product_compatibility) = 4, 'staff sees unverified compatibility');
select test.ok(adjust_stock('40000000-0000-0000-0000-000000000003', 4, 'purchase', 'restock') = 4, 'staff can adjust stock');
select test.ok((select count(*) from inventory_movements where product_id = '40000000-0000-0000-0000-000000000003') = 1, 'stock movement is logged');
select test.raises($$select adjust_stock('40000000-0000-0000-0000-000000000003', -10, 'damage')$$, 'insufficient_stock', 'stock cannot go negative');
select test.raises($$select adjust_stock('40000000-0000-0000-0000-000000000003', -1, 'sale')$$, 'reason_reserved_for_orders', 'sale movements come from orders only');
select test.raises($$select set_user_role('00000000-0000-0000-0000-00000000000c', 'staff')$$, 'forbidden', 'staff cannot change roles');
select test.ok(adjust_stock('40000000-0000-0000-0000-000000000003', -4, 'adjustment', 'reset') = 0, 'reset HP 59A to 0');

set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000a');
select set_user_role('00000000-0000-0000-0000-00000000000e', 'customer');
select test.raises($$select set_user_role('00000000-0000-0000-0000-00000000000a', 'customer')$$, 'cannot_demote_self', 'admin cannot demote themselves');
reset role;
