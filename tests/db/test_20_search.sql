-- Search, filters, sorting and autocomplete. Runs as anon (search is public).
\set QUIET on
set role anon;
select test.login(null);
select test.ok((select count(*) from search_products('057H')) = 2, 'code search "057H" finds original + compatible');
select test.ok((select count(*) from search_products('crg-057h')) >= 1, 'punctuation-insensitive SKU search "crg-057h"');
select test.ok((select count(*) from search_products('3010C002')) = 2, 'OEM reference search');
select test.ok((select count(*) from search_products('mf443dw')) = 2, 'printer model search returns its verified supplies only');
select test.ok(not exists (select 1 from search_products('mf443dw') where sku = 'CF259A'), 'unverified compatible product is not returned for the printer');
select test.ok((select count(*) from search_products('cannon toner')) >= 2, 'typo tolerance: "cannon" finds Canon');
select test.ok((select count(*) from search_products('تونر')) = 3, 'Arabic search');
select test.ok((select count(*) from search_products('toner compatible')) >= 1, 'French words');
select test.ok((select count(*) from search_products('draft')) = 0, 'drafts are never searchable');
select test.ok((select count(*) from search_products('zzzzqqq')) = 0, 'no results for nonsense');
select test.ok((select count(*) from search_products(p_origin => 'compatible')) = 1, 'origin filter');
select test.ok((select count(*) from search_products(p_brands => array['canon'])) = 2, 'brand filter');
select test.ok((select count(*) from search_products(p_colors => array['cyan'::ink_color])) = 1, 'colour filter');
select test.ok((select count(*) from search_products(p_category => 'ink-toner')) = 4, 'parent category includes subcategories');
select test.ok((select count(*) from search_products(p_category => 'ink-bottles')) = 1, 'leaf category');
select test.ok((select count(*) from search_products(p_in_stock => true)) = 3, 'in-stock filter hides HP 59A');
select test.ok((select count(*) from search_products(p_min_price => 5000, p_max_price => 16000)) = 2, 'price range');
select test.ok((select count(*) from search_products(p_printer => '30000000-0000-0000-0000-000000000001')) = 2, 'printer filter uses verified links only');
select test.ok((select array_agg(sku order by ord) from (
    select sku, row_number() over () as ord from search_products(p_sort => 'price_asc')) t)
  = array['GI41C', 'RI-057H', 'CF259A', 'CRG057H-OEM'], 'sort by price ascending');
select test.ok((select sku from search_products(p_sort => 'price_desc') limit 1) = 'CRG057H-OEM', 'sort by price descending');
select test.ok((select total_count from search_products(p_limit => 1) limit 1) = 4, 'total_count is reported with pagination');
select test.ok((select count(*) from search_products(p_limit => 2, p_offset => 2)) = 2, 'offset pagination');
select test.ok(jsonb_array_length(search_suggestions('mf44')->'printers') = 2, 'autocomplete suggests printer models');
select test.ok(jsonb_array_length(search_suggestions('057')->'products') = 2, 'autocomplete suggests products');
select test.ok(jsonb_array_length(search_suggestions('bouteilles')->'categories') >= 1, 'autocomplete suggests categories');
select test.ok(search_suggestions('a') = '{"products": [], "printers": [], "categories": []}', 'no suggestions under 2 characters');
reset role;
