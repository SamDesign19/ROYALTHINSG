# Data policy and what still has to be provided

Nothing in the production database is invented. This table shows where each kind of data comes from.

| Data | Status | Source / action |
|---|---|---|
| Wilayas | Seeded (58, as in the brief) | `supabase/seed/01_reference.sql`. Algeria has announced additional wilayas; admins can add rows (`wilayas.code` accepts up to 99) once the official list to use is confirmed. |
| Communes | **Empty** | Import from an official list (ONS / Ministry of Interior) as CSV: `wilaya_code, name_ar, name_fr, postal_code`. Checkout works without communes (field optional) until imported. |
| Delivery fees | **Empty** | Business decision. Set per wilaya and method in Admin → Delivery. A wilaya with no active rate cannot be selected at checkout. |
| Pickup points | **Empty** | Business data (e.g. the El Eulma HQ). |
| Categories | Seeded (structure only) | Editable in Admin → Categories. |
| Products, prices, stock | **Import ready** | `scripts/import/royalink_db_to_sql.py` converts `ROYALINK DATABASE.xlsx` (1 135 items) into SQL: all **drafts**, opening stock recorded once. Export prices are not confirmed selling prices: staff review, then publish. `status = 'active'` requires a real price. |
| Printer compatibility | **Empty** | Only `verified = true` links are shown to customers. Supplier data (for example the Tinkco export used in the earlier `formation` prototype) can be imported as **unverified** with `source` set, then verified by staff. |
| Payment providers | None | Cash on delivery only. Online payment is added only after a real provider (e.g. CIB/Edahabia via SATIM) is contracted and configured. |
| Analytics | Derived | Computed from real orders; empty until orders exist. |

Test fixtures in `tests/db/02_fixtures.sql` contain invented prices and links **for automated tests only**.
