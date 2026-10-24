import { expect, test } from "@playwright/test";

// Uses the test fixtures: GI-41 cyan (1 800 DA, stock 50), compatible 057H (6 500 DA, stock 3),
// delivery rates for wilaya 19 (home 400 DA, pickup free) and promo code WELCOME10 (-10 %).

const cartLink = (page: import("@playwright/test").Page) => page.locator('header a[href="/fr/cart"]');

test("cart → checkout → cash-on-delivery order → tracking", async ({ page }) => {
  await page.goto("/fr/p/canon-gi-41-cyan");
  await page.getByRole("button", { name: "Augmenter la quantité" }).click();
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("Ajouté au panier")).toBeVisible();
  await expect(cartLink(page)).toHaveAttribute("aria-label", "Panier, 2 articles");

  await page.goto("/fr/cart");
  await expect(page.locator("aside")).toContainText("3 600 DA");
  await page.getByRole("link", { name: "Passer la commande" }).click();
  await expect(page).toHaveURL(/\/fr\/checkout$/);

  const main = page.locator("main");
  await main.getByLabel("Nom complet").fill("Client E2E");
  await main.getByLabel("Téléphone").fill("12345");
  await main.getByLabel("Téléphone").blur();
  await expect(main.getByText("Veuillez saisir un numéro de téléphone algérien valide.")).toBeVisible();
  await main.getByLabel("Téléphone").fill("+213 551 23 45 67");
  await main.getByLabel("Wilaya").selectOption("19");
  await main.getByLabel("Adresse", { exact: true }).fill("Cité 100 logements, El Eulma");
  await expect(main.locator("form")).toContainText("4 000 DA"); // 3 600 + 400 home delivery
  await main.getByLabel("Code promo (facultatif)").fill("welcome10");
  await main.getByRole("button", { name: "Confirmer la commande" }).click();

  await expect(page).toHaveURL(/\/fr\/checkout\/confirmation\/RI-\d+$/);
  const number = page.url().split("/").pop()!;
  await expect(main).toContainText("3 640 DA"); // 3 600 − 10 % + 400
  await expect(main).toContainText("0551234567");
  await expect(cartLink(page)).toHaveAttribute("aria-label", "Panier vide");

  await main.getByRole("link", { name: "Suivre cette commande" }).click();
  await main.getByLabel("Téléphone").fill("0551234567");
  await main.getByRole("button", { name: "Suivre" }).click();
  await expect(main.getByText(number)).toBeVisible();
  await expect(main.locator('[aria-current="step"]')).toContainText("Reçue");

  await main.getByLabel("Téléphone").fill("0661000000");
  await main.getByRole("button", { name: "Suivre" }).click();
  await expect(main.getByText("Aucune commande ne correspond à ce numéro et ce téléphone.")).toBeVisible();
});

test("stock is checked by the database and the form keeps its values", async ({ page }) => {
  await page.goto("/fr/search");
  const card = page.locator("main article").filter({ hasText: "Toner compatible Canon 057H" });
  await card.hover();
  await card.getByRole("button", { name: /Ajouter au panier/ }).click();
  await expect(cartLink(page)).toHaveAttribute("aria-label", "Panier, 1 article");

  await page.goto("/fr/cart");
  await page.locator("main li").getByLabel("Quantité", { exact: true }).fill("5"); // only 3 in stock
  await expect(page.locator("aside")).toContainText("32 500 DA");
  await page.getByRole("link", { name: "Passer la commande" }).click();

  const main = page.locator("main");
  await main.getByLabel("Nom complet").fill("Client E2E");
  await main.getByLabel("Téléphone").fill("0551234567");
  await main.getByLabel("Wilaya").selectOption("19");
  await main.getByText("Point relais", { exact: true }).click();
  await main.getByLabel("Point relais", { exact: true }).selectOption({ label: "Test pickup — Test address" });
  await main.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(main.getByRole("alert")).toHaveText("Stock insuffisant pour « Toner compatible Canon 057H ». Réduisez la quantité.");
  await expect(main.getByLabel("Nom complet")).toHaveValue("Client E2E");
  await expect(page).toHaveURL(/\/fr\/checkout$/);
});

test("checkout without a cart goes back to the empty cart", async ({ page }) => {
  await page.goto("/fr/checkout");
  await expect(page).toHaveURL(/\/fr\/cart$/);
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();
});
