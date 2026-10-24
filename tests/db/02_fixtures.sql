-- TEST ONLY fixtures. Prices, stock and compatibility here are invented for tests and
-- must never be loaded into a real database.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'staff@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'customer@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'business@test.local'),
  ('00000000-0000-0000-0000-00000000000e', 'other@test.local');
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update profiles set role = 'staff' where id = '00000000-0000-0000-0000-00000000000b';
insert into business_accounts (profile_id, company_name, status)
values ('00000000-0000-0000-0000-00000000000d', 'Test SARL', 'approved');

insert into brands (id, slug, name, makes_printers) values
  ('10000000-0000-0000-0000-000000000001', 'canon', 'Canon', true),
  ('10000000-0000-0000-0000-000000000002', 'hp', 'HP', true),
  ('10000000-0000-0000-0000-000000000003', 'royal-ink', 'ROYAL INK', false);

insert into printer_series (id, brand_id, slug, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'i-sensys-mf440', 'i-SENSYS MF440');
insert into printers (id, brand_id, series_id, slug, model, kind) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'canon-i-sensys-mf443dw', 'i-SENSYS MF443dw', 'multifunction'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'canon-i-sensys-mf445dw', 'i-SENSYS MF445dw', 'multifunction'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', null, 'hp-laserjet-pro-m404', 'LaserJet Pro M404', 'laser');

insert into products (id, slug, sku, product_type, category_id, brand_id, name, model_code, oem_reference, origin, color, yield_type, page_yield, price_dzd, status) values
  ('40000000-0000-0000-0000-000000000001', 'canon-057h-original', 'CRG057H-OEM', 'toner',
   (select id from categories where slug = 'toner-cartridges'), '10000000-0000-0000-0000-000000000001',
   '{"fr": "Toner Canon 057H noir", "en": "Canon 057H black toner", "ar": "تونر كانون 057H أسود"}',
   '057H', '3010C002', 'original', 'black', 'high', 10000, 18000, 'active'),
  ('40000000-0000-0000-0000-000000000002', 'royal-ink-057h-compatible', 'RI-057H', 'toner',
   (select id from categories where slug = 'toner-cartridges'), '10000000-0000-0000-0000-000000000003',
   '{"fr": "Toner compatible Canon 057H", "en": "Compatible toner for Canon 057H", "ar": "تونر متوافق مع كانون 057H"}',
   '057H', '3010C002', 'compatible', 'black', 'high', 10000, 6500, 'active'),
  ('40000000-0000-0000-0000-000000000003', 'hp-59a-original', 'CF259A', 'toner',
   (select id from categories where slug = 'toner-cartridges'), '10000000-0000-0000-0000-000000000002',
   '{"fr": "Toner HP 59A noir", "en": "HP 59A black toner", "ar": "تونر HP 59A أسود"}',
   '59A', 'CF259A', 'original', 'black', 'standard', 3000, 15000, 'active'),
  ('40000000-0000-0000-0000-000000000004', 'canon-gi-41-cyan', 'GI41C', 'ink_bottle',
   (select id from categories where slug = 'ink-bottles'), '10000000-0000-0000-0000-000000000001',
   '{"fr": "Bouteille d''encre Canon GI-41 cyan", "en": "Canon GI-41 cyan ink bottle", "ar": "زجاجة حبر كانون GI-41 سماوي"}',
   'GI-41', '4543C001', 'original', 'cyan', null, 7700, 1800, 'active'),
  ('40000000-0000-0000-0000-000000000005', 'draft-product', 'DRAFT-1', 'toner',
   (select id from categories where slug = 'toner-cartridges'), '10000000-0000-0000-0000-000000000001',
   '{"fr": "Produit brouillon", "en": "Draft product"}', 'DRAFT', null, 'original', 'black', null, null, null, 'draft');

-- Stock: 057H OEM 10, compatible 3 (low), HP 59A 0 (out), GI-41 50.
do $$ begin
  perform apply_stock_change('40000000-0000-0000-0000-000000000001', 10, 'initial');
  perform apply_stock_change('40000000-0000-0000-0000-000000000002', 3, 'initial');
  perform apply_stock_change('40000000-0000-0000-0000-000000000004', 50, 'initial');
end $$;

insert into price_tiers (product_id, min_quantity, price_dzd, business_only) values
  ('40000000-0000-0000-0000-000000000004', 10, 1500, true);

insert into product_compatibility (product_id, printer_id, verified, source, verified_at) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', true, 'test', now()),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', true, 'test', now()),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', true, 'test', now()),
  -- Unverified: must never be shown to shoppers.
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', false, 'supplier claim', null);

insert into communes (id, wilaya_code, name, postal_code) values
  (900001, 19, '{"fr": "Sétif (test)", "ar": "سطيف"}', '19000'),
  (900002, 19, '{"fr": "El Eulma (test)", "ar": "العلمة"}', '19600'),
  (900003, 16, '{"fr": "Alger Centre (test)", "ar": "الجزائر الوسطى"}', '16000');
insert into pickup_points (id, wilaya_code, commune_id, name, address) values
  ('50000000-0000-0000-0000-000000000001', 19, 900002, 'Test pickup', 'Test address');
insert into delivery_rates (wilaya_code, method, fee_dzd, free_over_dzd) values
  (19, 'home', 400, 50000),
  (19, 'pickup', 0, null),
  (16, 'home', 700, null);

insert into promo_codes (code, kind, value, min_subtotal_dzd, max_uses) values
  ('WELCOME10', 'percent', 10, 0, null),
  ('BIG', 'fixed', 1000, 20000, null),
  ('SHIPFREE', 'free_shipping', 0, 0, 1);
