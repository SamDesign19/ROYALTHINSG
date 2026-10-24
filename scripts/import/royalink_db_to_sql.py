#!/usr/bin/env python3
"""Turns the ROYALINK stock export ("ROYALINK DATABASE.xlsx") into an import SQL file.

    python3 scripts/import/royalink_db_to_sql.py "ROYALINK DATABASE.xlsx" [out.sql]

The output (default .local-imports/royalink-catalog.sql, git-ignored) contains business data
(prices, stock), so it must never be committed. Paste it into the Supabase SQL editor.

What the SQL does, in one transaction, and safely re-runnable:
  * adds the categories and brands it needs (existing rows are left untouched),
  * inserts every product as status = 'draft' (invisible to shoppers): prices in the file are
    not confirmed as selling prices, so staff review them before publishing,
  * records the opening stock once per product as an 'initial' inventory movement,
  * never deletes or updates existing products, and imports no printer compatibility.

Expected columns of the export (it has no header row): B = internal id, D = name,
E = quantity, M = price, AC = category path ("consomable/Toner", "Machine/Pc", ...).
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

IMPORT_NOTE = "Import ROYALINK DATABASE.xlsx"
COL_ID, COL_NAME, COL_QTY, COL_PRICE, COL_CATEGORY = 1, 3, 4, 12, 28

# Product brands recognised in names, with their display names. Royalink-branded items are
# compatible consumables sold under the ROYAL INK brand.
BRANDS = {
    "canon": "Canon", "hp": "HP", "epson": "Epson", "kyocera": "Kyocera", "brother": "Brother",
    "xerox": "Xerox", "pantum": "Pantum", "ricoh": "Ricoh", "samsung": "Samsung", "lexmark": "Lexmark",
    "oki": "OKI", "konica-minolta": "Konica Minolta", "sharp": "Sharp", "toshiba": "Toshiba",
    "lenovo": "Lenovo", "dell": "Dell", "asus": "Asus", "acer": "Acer", "msi": "MSI", "apple": "Apple",
    "adata": "ADATA", "kingston": "Kingston", "sandisk": "SanDisk", "seagate": "Seagate",
    "western-digital": "Western Digital", "toshiba-storage": "Toshiba", "logitech": "Logitech",
    "tenda": "Tenda", "tp-link": "TP-Link", "d-link": "D-Link", "huawei": "Huawei", "apc": "APC",
    "riso": "Riso", "panasonic": "Panasonic", "zebra": "Zebra", "gemalto": "Gemalto",
    "kaspersky": "Kaspersky", "microsoft": "Microsoft", "benq": "BenQ", "viewsonic": "ViewSonic",
    "optoma": "Optoma", "lg": "LG", "philips": "Philips", "rongda": "Rongda", "duplo": "Duplo",
    "royal-ink": "ROYAL INK", "lexprint": "Lexprint",
}
# House and third-party brands of compatible (non-OEM) consumables.
COMPATIBLE_BRANDS = {"royal-ink", "lexprint"}
BRAND_PATTERNS = [  # (regex on the upper-cased name, brand slug); first match wins
    (r"\bROYAL\s*-?\s*INK\b|\bROYALINK\b", "royal-ink"),
    (r"\bLEXPRINT\b", "lexprint"),
    (r"\bCANON\b|\bCRG\b|\bNPG\b|\bEXV\b", "canon"),
    (r"\bHP\b|\bLASERJET\b|\bDESKJET\b", "hp"),
    (r"\bEPSON\b|\bECO ?TANK\b", "epson"),
    (r"\bKYOCERA\b|\bTK-?\d", "kyocera"),
    (r"\bBROTHER\b", "brother"), (r"\bXEROX\b|\bVERSALINK\b", "xerox"), (r"\bPANTUM\b", "pantum"),
    (r"\bRICOH\b|\bRICHO\b|\bRICHOU\b", "ricoh"), (r"\bSAMSUNG\b", "samsung"), (r"\bLEXMARK\b", "lexmark"),
    (r"\bOKI\b", "oki"), (r"\bKONICA\b|\bMINOLTA\b", "konica-minolta"), (r"\bSHARP\b", "sharp"),
    (r"\bTOSHIBA\b", "toshiba"), (r"\bLENOVO\b|\bTHINKPAD\b|\bIDEAPAD\b", "lenovo"), (r"\bDELL\b", "dell"),
    (r"\bASUS\b", "asus"), (r"\bACER\b", "acer"), (r"\bMSI\b", "msi"), (r"\bAPPLE\b|\bMACBOOK\b|\bIPAD\b", "apple"),
    (r"\bADATA\b", "adata"), (r"\bKINGSTON\b", "kingston"), (r"\bSANDISK\b", "sandisk"),
    (r"\bSEAGATE\b", "seagate"), (r"\bWESTERN DIGITAL\b|\bWD\b", "western-digital"),
    (r"\bLOGITECH\b", "logitech"), (r"\bTENDA\b", "tenda"), (r"\bTP-?LINK\b", "tp-link"),
    (r"\bD-?LINK\b", "d-link"), (r"\bHUAWEI\b", "huawei"), (r"\bAPC\b", "apc"), (r"\bRISO\b", "riso"),
    (r"\bPANASONIC\b", "panasonic"), (r"\bZEBRA\b", "zebra"), (r"\bGEMALTO\b", "gemalto"),
    (r"\bKASPERSKY\b", "kaspersky"), (r"\bMICROSOFT\b|\bWINDOWS\b|\bOFFICE 365\b", "microsoft"),
    (r"\bBENQ\b", "benq"), (r"\bVIEWSONIC\b", "viewsonic"), (r"\bOPTOMA\b", "optoma"), (r"\bLG\b", "lg"),
    (r"\bPHILIPS\b", "philips"), (r"\bRONGDA\b", "rongda"), (r"\bDUPLO\b", "duplo"),
]

# Category path from the export -> (category slug, product type).
CATEGORY_MAP = {
    "consomable/toner": ("toner-cartridges", "toner"),
    "consomable/cartouche": ("ink-cartridges", "ink_cartridge"),
    "consomable/bouteuille": ("ink-bottles", "ink_bottle"),
    "consomable/drum": ("drum-units", "drum"),
    "consomable/boite maintenance": ("maintenance-boxes", "maintenance_box"),
    "consomable/fuser": ("printer-parts", "printer_part"),
    "reseaugraphe/encre": ("duplicator-supplies", "other"),
    "reseaugraphe/master": ("duplicator-supplies", "other"),
    "machine/imprimante": ("printers", "printer"),
    "machine/pc": ("desktops", "other"),
    "machine/laptop": ("laptops", "other"),
    "machine/moniteur": ("monitors", "other"),
    "machine/projecteur": ("projectors", "other"),
    "machine/scanner": ("scanners", "other"),
    "machine/fax": ("office-misc", "other"),
    "machine/compteuse": ("counting-machines", "other"),
    "machine/onduleur": ("power-protection", "other"),
    "machine/modeme": ("networking", "other"),
    "machine/divers": ("office-misc", "other"),
    "machine": ("duplicators", "other"),
    "accesoire/disque dure": ("storage", "other"),
    "accesoire/cd/dvd": ("storage", "other"),
    "accesoire/souris": ("peripherals", "other"),
    "accesoire/clavier": ("peripherals", "other"),
    "accesoire/speaker": ("peripherals", "other"),
    "accesoire/ram": ("components", "other"),
    "accesoire/cpu": ("components", "other"),
    "accesoire/alimentation": ("components", "other"),
    "accesoire/cablage": ("networking", "other"),
    "accesoire/reseau": ("networking", "other"),
    "accesoire/kaspersky": ("software", "other"),
    "accesoire/license": ("software", "other"),
    "accesoire/multiprise": ("power-protection", "other"),
    "accesoire/ruban": ("ribbons", "other"),
}
# Applied before the category path (items filed under a generic path) and as the fallback.
NAME_RULES = [
    (r"\bSACOCHE\b|\bHOUSSE\b|\bSAC A DOS\b", ("peripherals", "other")),
    (r"\bCHAISE\b|\bBUREAU ENFANT\b|^BUREAU\b|\bTABLE\b|\bFAUTEUIL\b|\bARMOIRE\b", ("office-furniture", "other")),
    (r"\bECRAN\b|\bMONITEUR\b", ("monitors", "other")),
]
FALLBACK_RULES = [
    (r"\bTONER\b", ("toner-cartridges", "toner")),
    (r"\bDRUM\b|\bTAMBOUR\b", ("drum-units", "drum")),
    (r"\bCARTOUCHE\b", ("ink-cartridges", "ink_cartridge")),
    (r"\bBOUTEILLE\b", ("ink-bottles", "ink_bottle")),
    (r"\bPAPIER\b|\bRAMETTE\b", ("paper", "paper")),
    (r"\bETIQUETTE", ("labels", "label")),
    (r"\bIMPRIMANTE\b|\bPHOTOCOPIEUR\b", ("printers", "printer")),
    (r"\bLAPTOP\b|\bPORTABLE\b", ("laptops", "other")),
    (r"\bSOURIS\b|\bCLAVIER\b|\bHUB\b|\bWEB ?CAM\b|\bCASQUE\b|\bMANETTE\b|\bHAUT.PARLEUR\b", ("peripherals", "other")),
    (r"\bCABLE\b|\bHDMI\b|\bEXTENDER\b|\bROUTEUR\b|\bSWITCH\b|\bMODEM\b", ("networking", "other")),
    (r"\bSSD\b|\bHDD\b|\bDISQUE\b|\bFLASH\b|\bCLE USB\b", ("storage", "other")),
    (r"\bRAM\b|\bDDR\d?\b|\bBOITIER\b|\bCARTE MERE\b", ("components", "other")),
]
PRINTER_SUBCATEGORY = [
    (r"ECO ?TANK|SMART TANK|INK ?TANK|\bL\d{3,4}\b|\bG\d{4}\b", "tank-printers"),
    (r"PHOTOCOPIEUR|MULTIFONCTION|\bMFP?\b|\bMF\d", "multifunction-printers"),
    (r"LASER|\bECOSYS\b|PANTUM|\bM\d{3}", "laser-printers"),
    (r"JET D.ENCRE|DESKJET|PIXMA|INKJET", "inkjet-printers"),
]
CONSUMABLE_TYPES = {"toner", "ink_cartridge", "ink_bottle", "drum", "maintenance_box"}
COLOR_RULES = [  # (regex on the name, ink_color) for consumables
    (r"\bJEU\b|\bPACK\b|\bKIT\b.*\bCOULEUR", "multi"),
    # Single letters count only as separate words ("TK-5220 C"), not inside codes ("M-310").
    (r"(?<![\w-])(BK|BLACK|NOIR|NOIRE|K)(?![\w-])", "black"), (r"(?<![\w-])(C|CYAN)(?![\w-])", "cyan"),
    (r"(?<![\w-])(M|MAGENTA)(?![\w-])", "magenta"), (r"(?<![\w-])(Y|YELLOW|JAUNE)(?![\w-])", "yellow"),
]
CODE_RE = re.compile(r"\b([A-Z]{0,5}-?\s?\d{2,5}[A-Z]{0,3})\b")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip()


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", norm(s).lower()).strip("-")
    return s[:80].strip("-") or "produit"


def first_match(rules, text):
    for pattern, value in rules:
        if re.search(pattern, text):
            return value
    return None


def classify(category_path: str, upper_name: str) -> tuple[str, str]:
    hit = first_match(NAME_RULES, upper_name)
    if hit:
        return hit
    mapped = CATEGORY_MAP.get(norm(category_path).lower())
    if mapped and mapped[0] == "printers":
        return (first_match(PRINTER_SUBCATEGORY, upper_name) or "printers", "printer")
    if mapped:
        return mapped
    return first_match(FALLBACK_RULES, upper_name) or ("office-misc", "other")


def model_code(upper_name: str, brand_slug: str | None) -> str | None:
    words = re.sub(r"\b(TONER|DRUM|TAMBOUR|CARTOUCHE|BOUTEILLE|FUSER|ENCRE|ROYAL ?INK|ROYALINK|LEXPRINT|JEU|ORIGINAL[E]?)\b", " ", upper_name)
    # Quantities and sizes are not product codes: "4*100ml", "1L", "50M", "8GB".
    words = re.sub(r"\b\d+\s*\*\s*\d+\s*ML\b|\b[A-Z]{0,3}-?\d+\s*(ML|L|M|G|GB|GO|TB|CL)\b", " ", words)
    if brand_slug:
        words = re.sub(r"\b" + re.escape(BRANDS[brand_slug].upper()) + r"\b", " ", words)
    m = CODE_RE.search(words)
    return re.sub(r"\s+", "-", m.group(1)) if m else None


def sql_text(v) -> str:
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(".local-imports/royalink-catalog.sql")
    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).active

    rows, seen_sku, seen_slug, notes = [], set(), set(), []
    for row in ws.iter_rows(values_only=True):
        if len(row) <= COL_CATEGORY or row[COL_ID] is None or not row[COL_NAME]:
            continue
        raw_name = re.sub(r"\s+", " ", str(row[COL_NAME])).strip().lstrip("/").strip(" -")
        upper = norm(raw_name).upper()
        category, ptype = classify(str(row[COL_CATEGORY] or ""), upper)
        brand = first_match(BRAND_PATTERNS, upper)
        printer_brand = first_match(BRAND_PATTERNS[2:], upper) if brand in COMPATIBLE_BRANDS else None
        consumable = ptype in CONSUMABLE_TYPES or category in ("printer-parts", "duplicator-supplies", "ribbons")
        origin = None
        if consumable:
            origin = "compatible" if brand in COMPATIBLE_BRANDS else ("original" if re.search(r"\bORIGINAL", upper) else None)

        base_sku = f"RI-{int(row[COL_ID])}"
        sku, n = base_sku, 1
        while sku in seen_sku:
            n += 1
            sku = f"{base_sku}-{n}"
        seen_sku.add(sku)
        slug = f"{slugify(raw_name)}-{sku.lower()}"
        seen_slug.add(slug)

        qty = int(row[COL_QTY] or 0)
        if qty < 0:
            notes.append(f"{sku} {raw_name}: negative stock {qty} imported as 0")
            qty = 0
        if qty > 10000:
            notes.append(f"{sku} {raw_name}: unusually large stock {qty}, please check")
        price = float(row[COL_PRICE] or 0)
        rows.append({
            "sku": sku, "slug": slug, "name": json.dumps({"fr": raw_name}, ensure_ascii=False),
            "type": ptype, "category": category, "brand": brand,
            "code": model_code(upper, printer_brand or brand) if consumable else None,
            "origin": origin,
            "color": first_match(COLOR_RULES, upper) if ptype in CONSUMABLE_TYPES else None,
            "price": round(price, 2) if price > 0 else None, "qty": qty,
            "source": norm(str(row[COL_CATEGORY] or "")),
        })

    used_brands = sorted({r["brand"] for r in rows if r["brand"]})
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        f.write(f"-- ROYAL INK catalog import from {src.name} ({len(rows)} products). Generated by\n")
        f.write("-- scripts/import/royalink_db_to_sql.py. Contains business data: do not commit or share.\n")
        f.write("-- Safe to re-run: existing categories, brands and products are never changed.\n")
        f.write("-- Every product is imported as a DRAFT (not visible in the store). Review prices, then publish\n")
        f.write("-- (see the queries at the end of this file).\n\nbegin;\n\n")
        f.write("-- Categories used by the import (also in supabase/seed/01_reference.sql).\n")
        seed = Path(__file__).resolve().parents[2] / "supabase/seed/01_reference.sql"
        for line in seed.read_text(encoding="utf-8").splitlines():
            if line.startswith("insert into categories"):
                f.write(line + "\n")
        f.write("\ninsert into brands (slug, name) values\n")
        f.write(",\n".join(f"  ({sql_text(b)}, {sql_text(BRANDS[b])})" for b in used_brands))
        f.write("\non conflict (slug) do nothing;\n\n")
        f.write("create temporary table _import (sku text, slug text, name jsonb, product_type product_type,\n"
                "  category text, brand text, model_code text, origin product_origin, color ink_color,\n"
                "  price_dzd numeric, quantity int, source text) on commit drop;\n\ninsert into _import values\n")
        f.write(",\n".join(
            f"  ({sql_text(r['sku'])}, {sql_text(r['slug'])}, {sql_text(r['name'])}, {sql_text(r['type'])}, "
            f"{sql_text(r['category'])}, {sql_text(r['brand'])}, {sql_text(r['code'])}, {sql_text(r['origin'])}, "
            f"{sql_text(r['color'])}, {'null' if r['price'] is None else r['price']}, {r['qty']}, {sql_text(r['source'])})"
            for r in rows))
        f.write(";\n\n")
        f.write(f"""insert into products (sku, slug, name, product_type, category_id, brand_id, model_code, origin,
  color, price_dzd, status, specs)
select i.sku, i.slug, i.name, i.product_type, c.id, b.id, i.model_code, i.origin, i.color, i.price_dzd,
       'draft', jsonb_build_object('import_category', i.source)
  from _import i
  join categories c on c.slug = i.category
  left join brands b on b.slug = i.brand
on conflict do nothing;

-- Opening stock, recorded once per product as an audited 'initial' movement.
do $$
declare r record;
begin
  for r in
    select p.id, i.quantity from _import i join products p on p.sku = i.sku
     where i.quantity > 0
       and not exists (select 1 from inventory_movements m where m.product_id = p.id and m.note = '{IMPORT_NOTE}')
  loop
    perform apply_stock_change(r.id, r.quantity, 'initial', null, '{IMPORT_NOTE}');
  end loop;
end $$;

commit;

-- Result: products per category (all drafts until published).
select c.slug as category, count(*) as products, count(*) filter (where p.price_dzd is null) as without_price
  from products p join categories c on c.id = p.category_id
 where p.sku like 'RI-%'
 group by c.slug order by count(*) desc;

-- ---------------------------------------------------------------------------
-- AFTER reviewing prices (Table editor -> products, filter sku starts with RI-), publish, e.g.:
--   update products set status = 'active'
--    where sku like 'RI-%' and status = 'draft' and price_dzd > 0
--      and category_id in (select id from categories where slug in ('toner-cartridges', 'ink-bottles'));
-- ---------------------------------------------------------------------------
""")
    print(f"wrote {out}: {len(rows)} products, {len(used_brands)} brands, "
          f"{sum(r['price'] is None for r in rows)} without price, {sum(r['qty'] > 0 for r in rows)} with stock")
    for note in notes:
        print("note:", note)


if __name__ == "__main__":
    main()
