import { expect, test } from "@playwright/test";

// Fixture data (tests/db/02_fixtures.sql): 4 active products, a draft, Canon/HP printers,
// verified links 057H OEM + compatible -> MF443dw, and an UNVERIFIED HP 59A -> MF443dw link.

test("home renders in every language with the right direction", async ({ page }) => {
  for (const [locale, dir, heading] of [
    ["ar", "rtl", "الحبر المناسب لطابعتك."],
    ["fr", "ltr", "La bonne encre pour votre imprimante."],
    ["en", "ltr", "The right ink for your printer."],
  ] as const) {
    await page.goto(`/${locale}`);
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("root redirects to the default locale", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/(ar|fr|en)$/);
});

test("find your ink lists only verified supplies", async ({ page }) => {
  await page.goto("/fr/find-your-ink");
  await page.getByLabel("Marque", { exact: true }).selectOption("canon");
  await expect(page.getByLabel("Modèle", { exact: true }).locator("option")).toHaveCount(3);
  await page.getByLabel("Série", { exact: true }).selectOption({ label: "i-SENSYS MF440" });
  await page.getByLabel("Modèle", { exact: true }).selectOption({ label: "i-SENSYS MF443dw" });
  await page.getByRole("button", { name: "Voir les consommables" }).click();
  await expect(page).toHaveURL(/\/fr\/find-your-ink\/printer\/canon-i-sensys-mf443dw$/);
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.getByText("Toner HP 59A noir")).toHaveCount(0);
});

test("product page shows price, availability, specs and verified printers only", async ({ page }) => {
  await page.goto("/fr/p/canon-057h-original");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Toner Canon 057H noir");
  await expect(page.locator("main").getByText("18 000").first()).toBeVisible();
  await expect(page.getByText("En stock", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /i-SENSYS MF443dw/ }).first()).toBeVisible();
  await expect(page.getByText("3010C002")).toBeVisible();
  // The compatible 057H is offered as an alternative.
  await expect(page.getByRole("heading", { name: "Également disponible" })).toBeVisible();
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld.offers).toMatchObject({ priceCurrency: "DZD", price: 18000 });

  await page.goto("/fr/p/hp-59a-original");
  await expect(page.getByText("Rupture de stock").first()).toBeVisible();
  await expect(page.getByText("Aucune compatibilité vérifiée")).toBeVisible();
});

test("search by code, autocomplete and empty state", async ({ page }) => {
  await page.goto("/fr");
  const box = page.getByRole("combobox").first();
  await box.fill("mf443");
  await expect(page.getByRole("option", { name: /MF443dw/ }).first()).toBeVisible();
  await box.fill("057h");
  await expect(page.getByRole("option", { name: /Toner Canon 057H noir/ })).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/fr\/search\?q=057h$/);
  await expect(page.locator("main article")).toHaveCount(2);

  await page.goto("/fr/search?q=zzzzzz");
  await expect(page.getByText("Aucun produit ne correspond à votre recherche.")).toBeVisible();
});

test("filters, chips and sorting update the listing", async ({ page }) => {
  await page.goto("/fr/search");
  await expect(page.locator("main article")).toHaveCount(4);
  const rail = page.locator("aside");
  await rail.getByLabel("Compatible").check();
  await expect(page).toHaveURL(/origin=compatible/);
  await expect(page.locator("main article")).toHaveCount(1);
  await rail.getByLabel("En stock uniquement").check();
  await expect(page).toHaveURL(/stock=1/);
  await page.getByRole("link", { name: "Retirer le filtre Compatible" }).click();
  await expect(page).not.toHaveURL(/origin/);
  await expect(rail.getByLabel("Toutes")).toBeChecked();
  await expect(page.locator("main article")).toHaveCount(3);
  await rail.locator("input[name=max]").fill("7000");
  await rail.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/max=7000/);
  await expect(page.locator("main article")).toHaveCount(2);

  await page.goto("/fr/search");
  await page.getByLabel("Trier par").selectOption("price_desc");
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page.locator("main article h3").first()).toHaveText("Toner Canon 057H noir");
});

test("category pages include subcategories", async ({ page }) => {
  await page.goto("/en/c/ink-toner");
  await expect(page.locator("main article")).toHaveCount(4);
  await page.getByRole("navigation", { name: "Subcategories" }).getByRole("link", { name: "Ink bottles" }).click();
  await expect(page).toHaveURL(/\/en\/c\/ink-bottles$/);
  await expect(page.locator("main article")).toHaveCount(1);
});

test("language switch keeps the page and query", async ({ page }) => {
  await page.goto("/fr/search?q=057h");
  await page.getByRole("button", { name: /Langue/ }).click();
  await page.getByRole("link", { name: "العربية" }).first().click();
  await expect(page).toHaveURL(/\/ar\/search\?q=057h$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("unknown, draft and unpublished pages are real 404s", async ({ request }) => {
  for (const path of ["/fr/p/draft-product", "/fr/c/nope", "/fr/brands/nope", "/fr/find-your-ink/printer/nope", "/fr/collections/nope", "/fr/nope"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
