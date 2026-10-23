-- Reference data only: Algeria's 58 wilayas (as listed in the project brief), the catalog
-- category structure and default settings. No products, prices, stock or delivery fees are
-- seeded: those are business data entered from the admin dashboard.
-- English uses the official French transliteration.

insert into wilayas (code, name) values
  (1, '{"fr": "Adrar", "en": "Adrar", "ar": "أدرار"}'),
  (2, '{"fr": "Chlef", "en": "Chlef", "ar": "الشلف"}'),
  (3, '{"fr": "Laghouat", "en": "Laghouat", "ar": "الأغواط"}'),
  (4, '{"fr": "Oum El Bouaghi", "en": "Oum El Bouaghi", "ar": "أم البواقي"}'),
  (5, '{"fr": "Batna", "en": "Batna", "ar": "باتنة"}'),
  (6, '{"fr": "Béjaïa", "en": "Béjaïa", "ar": "بجاية"}'),
  (7, '{"fr": "Biskra", "en": "Biskra", "ar": "بسكرة"}'),
  (8, '{"fr": "Béchar", "en": "Béchar", "ar": "بشار"}'),
  (9, '{"fr": "Blida", "en": "Blida", "ar": "البليدة"}'),
  (10, '{"fr": "Bouira", "en": "Bouira", "ar": "البويرة"}'),
  (11, '{"fr": "Tamanrasset", "en": "Tamanrasset", "ar": "تمنراست"}'),
  (12, '{"fr": "Tébessa", "en": "Tébessa", "ar": "تبسة"}'),
  (13, '{"fr": "Tlemcen", "en": "Tlemcen", "ar": "تلمسان"}'),
  (14, '{"fr": "Tiaret", "en": "Tiaret", "ar": "تيارت"}'),
  (15, '{"fr": "Tizi Ouzou", "en": "Tizi Ouzou", "ar": "تيزي وزو"}'),
  (16, '{"fr": "Alger", "en": "Alger", "ar": "الجزائر"}'),
  (17, '{"fr": "Djelfa", "en": "Djelfa", "ar": "الجلفة"}'),
  (18, '{"fr": "Jijel", "en": "Jijel", "ar": "جيجل"}'),
  (19, '{"fr": "Sétif", "en": "Sétif", "ar": "سطيف"}'),
  (20, '{"fr": "Saïda", "en": "Saïda", "ar": "سعيدة"}'),
  (21, '{"fr": "Skikda", "en": "Skikda", "ar": "سكيكدة"}'),
  (22, '{"fr": "Sidi Bel Abbès", "en": "Sidi Bel Abbès", "ar": "سيدي بلعباس"}'),
  (23, '{"fr": "Annaba", "en": "Annaba", "ar": "عنابة"}'),
  (24, '{"fr": "Guelma", "en": "Guelma", "ar": "قالمة"}'),
  (25, '{"fr": "Constantine", "en": "Constantine", "ar": "قسنطينة"}'),
  (26, '{"fr": "Médéa", "en": "Médéa", "ar": "المدية"}'),
  (27, '{"fr": "Mostaganem", "en": "Mostaganem", "ar": "مستغانم"}'),
  (28, '{"fr": "M''Sila", "en": "M''Sila", "ar": "المسيلة"}'),
  (29, '{"fr": "Mascara", "en": "Mascara", "ar": "معسكر"}'),
  (30, '{"fr": "Ouargla", "en": "Ouargla", "ar": "ورقلة"}'),
  (31, '{"fr": "Oran", "en": "Oran", "ar": "وهران"}'),
  (32, '{"fr": "El Bayadh", "en": "El Bayadh", "ar": "البيض"}'),
  (33, '{"fr": "Illizi", "en": "Illizi", "ar": "إليزي"}'),
  (34, '{"fr": "Bordj Bou Arréridj", "en": "Bordj Bou Arréridj", "ar": "برج بوعريريج"}'),
  (35, '{"fr": "Boumerdès", "en": "Boumerdès", "ar": "بومرداس"}'),
  (36, '{"fr": "El Tarf", "en": "El Tarf", "ar": "الطارف"}'),
  (37, '{"fr": "Tindouf", "en": "Tindouf", "ar": "تندوف"}'),
  (38, '{"fr": "Tissemsilt", "en": "Tissemsilt", "ar": "تيسمسيلت"}'),
  (39, '{"fr": "El Oued", "en": "El Oued", "ar": "الوادي"}'),
  (40, '{"fr": "Khenchela", "en": "Khenchela", "ar": "خنشلة"}'),
  (41, '{"fr": "Souk Ahras", "en": "Souk Ahras", "ar": "سوق أهراس"}'),
  (42, '{"fr": "Tipaza", "en": "Tipaza", "ar": "تيبازة"}'),
  (43, '{"fr": "Mila", "en": "Mila", "ar": "ميلة"}'),
  (44, '{"fr": "Aïn Defla", "en": "Aïn Defla", "ar": "عين الدفلى"}'),
  (45, '{"fr": "Naâma", "en": "Naâma", "ar": "النعامة"}'),
  (46, '{"fr": "Aïn Témouchent", "en": "Aïn Témouchent", "ar": "عين تموشنت"}'),
  (47, '{"fr": "Ghardaïa", "en": "Ghardaïa", "ar": "غرداية"}'),
  (48, '{"fr": "Relizane", "en": "Relizane", "ar": "غليزان"}'),
  (49, '{"fr": "Timimoun", "en": "Timimoun", "ar": "تيميمون"}'),
  (50, '{"fr": "Bordj Badji Mokhtar", "en": "Bordj Badji Mokhtar", "ar": "برج باجي مختار"}'),
  (51, '{"fr": "Ouled Djellal", "en": "Ouled Djellal", "ar": "أولاد جلال"}'),
  (52, '{"fr": "Béni Abbès", "en": "Béni Abbès", "ar": "بني عباس"}'),
  (53, '{"fr": "In Salah", "en": "In Salah", "ar": "عين صالح"}'),
  (54, '{"fr": "In Guezzam", "en": "In Guezzam", "ar": "عين قزام"}'),
  (55, '{"fr": "Touggourt", "en": "Touggourt", "ar": "تقرت"}'),
  (56, '{"fr": "Djanet", "en": "Djanet", "ar": "جانت"}'),
  (57, '{"fr": "El M''Ghair", "en": "El M''Ghair", "ar": "المغير"}'),
  (58, '{"fr": "El Meniaa", "en": "El Meniaa", "ar": "المنيعة"}');

insert into categories (slug, parent_id, name, sort_order) values ('ink-toner', null, '{"fr": "Encre & toner", "en": "Ink & toner", "ar": "الحبر والتونر"}', 1);
insert into categories (slug, parent_id, name, sort_order) values ('ink-bottles', (select id from categories where slug = 'ink-toner'), '{"fr": "Bouteilles d''encre", "en": "Ink bottles", "ar": "زجاجات الحبر"}', 1);
insert into categories (slug, parent_id, name, sort_order) values ('ink-cartridges', (select id from categories where slug = 'ink-toner'), '{"fr": "Cartouches d''encre", "en": "Ink cartridges", "ar": "خراطيش الحبر"}', 2);
insert into categories (slug, parent_id, name, sort_order) values ('toner-cartridges', (select id from categories where slug = 'ink-toner'), '{"fr": "Toners laser", "en": "Toner cartridges", "ar": "خراطيش التونر"}', 3);
insert into categories (slug, parent_id, name, sort_order) values ('printers', null, '{"fr": "Imprimantes", "en": "Printers", "ar": "الطابعات"}', 2);
insert into categories (slug, parent_id, name, sort_order) values ('inkjet-printers', (select id from categories where slug = 'printers'), '{"fr": "Imprimantes jet d''encre", "en": "Inkjet printers", "ar": "طابعات نافثة للحبر"}', 1);
insert into categories (slug, parent_id, name, sort_order) values ('laser-printers', (select id from categories where slug = 'printers'), '{"fr": "Imprimantes laser", "en": "Laser printers", "ar": "طابعات ليزر"}', 2);
insert into categories (slug, parent_id, name, sort_order) values ('multifunction-printers', (select id from categories where slug = 'printers'), '{"fr": "Multifonctions", "en": "Multifunction printers", "ar": "طابعات متعددة الوظائف"}', 3);
insert into categories (slug, parent_id, name, sort_order) values ('tank-printers', (select id from categories where slug = 'printers'), '{"fr": "Imprimantes à réservoir", "en": "Ink tank printers", "ar": "طابعات بخزان حبر"}', 4);
insert into categories (slug, parent_id, name, sort_order) values ('supplies', null, '{"fr": "Fournitures", "en": "Supplies", "ar": "المستلزمات"}', 3);
insert into categories (slug, parent_id, name, sort_order) values ('drum-units', (select id from categories where slug = 'supplies'), '{"fr": "Tambours", "en": "Drum units", "ar": "وحدات الأسطوانة"}', 1);
insert into categories (slug, parent_id, name, sort_order) values ('maintenance-boxes', (select id from categories where slug = 'supplies'), '{"fr": "Boîtes de maintenance", "en": "Maintenance boxes", "ar": "علب الصيانة"}', 2);
insert into categories (slug, parent_id, name, sort_order) values ('printer-parts', (select id from categories where slug = 'supplies'), '{"fr": "Pièces d''imprimante", "en": "Printer parts", "ar": "قطع الطابعات"}', 3);
insert into categories (slug, parent_id, name, sort_order) values ('paper', (select id from categories where slug = 'supplies'), '{"fr": "Papier", "en": "Paper", "ar": "الورق"}', 4);
insert into categories (slug, parent_id, name, sort_order) values ('labels', (select id from categories where slug = 'supplies'), '{"fr": "Étiquettes", "en": "Labels", "ar": "الملصقات"}', 5);
insert into categories (slug, parent_id, name, sort_order) values ('cleaning', (select id from categories where slug = 'supplies'), '{"fr": "Nettoyage", "en": "Cleaning", "ar": "التنظيف"}', 6);

insert into settings (key, value) values
  ('reviews_enabled', 'false'),
  ('store', '{"name": "ROYAL INK", "currency": "DZD", "default_locale": "ar"}');
