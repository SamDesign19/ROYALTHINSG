\set QUIET on
-- Quotation requests work for guests; only the owner/staff can read them.
set role anon;
select test.login(null);
create temp table q as select submit_quote(
  '{"company_name": "Bureau Plus", "contact_name": "Karim", "phone": "0770 11 22 33", "wilaya_code": 16}',
  '[{"product_id": "40000000-0000-0000-0000-000000000002", "quantity": 50}, {"description": "Ramettes A4 80g", "quantity": 100}]') as res;
select test.ok((select res->>'quote_number' from q) like 'Q-%', 'guest can request a quotation');
select test.ok((select count(*) from quote_requests) = 0, 'guests cannot read quotations');
select test.raises($$select submit_quote('{"company_name": "x", "contact_name": "y", "phone": "0555000000"}', '[{"quantity": 0, "description": "x"}]')$$,
  'invalid_items', 'quantity must be positive');
select test.raises($$select submit_quote('{"company_name": "", "contact_name": "y", "phone": "0555000000"}', '[{"quantity": 1, "description": "x"}]')$$,
  'company_and_contact_required', 'company is required');
set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000b');
select test.ok((select count(*) from quote_request_items) = 2, 'staff sees quotation lines');

-- Reviews stay hidden until enabled by an admin.
select test.login('00000000-0000-0000-0000-00000000000c');
insert into reviews (product_id, user_id, rating, body) values ('40000000-0000-0000-0000-000000000001', auth.uid(), 5, 'Great');
select test.raises($$insert into reviews (product_id, user_id, rating, status) values ('40000000-0000-0000-0000-000000000002', auth.uid(), 5, 'approved')$$,
  'permission denied', 'customers cannot self-approve reviews');
select test.login('00000000-0000-0000-0000-00000000000b');
update reviews set status = 'approved';
set role anon;
select test.login(null);
select test.ok((select count(*) from reviews) = 0, 'approved review hidden while reviews are disabled');
set role authenticated;
select test.login('00000000-0000-0000-0000-00000000000a');
update settings set value = 'true' where key = 'reviews_enabled';
set role anon;
select test.login(null);
select test.ok((select count(*) from reviews) = 1, 'review visible once enabled');
reset role;
