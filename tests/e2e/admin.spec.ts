import { expect, test, type Page } from "@playwright/test";

// Back office, against the local stack (scripts/local-stack.sh): GoTrue + PostgREST + fixtures,
// with the TEST-ONLY admin account admin@royalink.test / local-admin-password.
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "admin@royalink.test", password: "local-admin-password" };
const GATEWAY = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function signIn(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("the back office requires a staff account", async ({ page, request }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Forders$/);

  await signIn(page, ADMIN.email, "wrong-password");
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveValue(ADMIN.email); // kept after a failed attempt

  // An ordinary customer account cannot get in.
  const email = `client-${Date.now()}@example.com`;
  const signup = await request.post(`${GATEWAY}/auth/v1/signup`, { headers: { apikey: KEY }, data: { email, password: "customer-password-1" } });
  expect(signup.ok()).toBe(true);
  await signIn(page, email, "customer-password-1");
  await expect(page.getByText("Ce compte n'a pas accès à l'administration.")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("orders: a cash-on-delivery order is confirmed with an invoice number", async ({ page }) => {
  // A guest places an order on the storefront.
  await page.goto("/fr/p/canon-gi-41-cyan");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("Ajouté au panier")).toBeVisible();
  await page.goto("/fr/checkout");
  const main = page.locator("main");
  await main.getByLabel("Nom complet").fill("Client Admin E2E");
  await main.getByLabel("Téléphone").fill("0551234567");
  await main.getByLabel("Wilaya").selectOption("19");
  await main.getByLabel("Adresse", { exact: true }).fill("Rue 1, Sétif");
  await main.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(page).toHaveURL(/confirmation\/RI-\d+$/);
  const number = page.url().split("/").pop()!;

  await page.goto("/admin/orders?status=pending");
  await signIn(page);
  await expect(page).toHaveURL(/\/admin\/orders\?status=pending$/);
  await page.getByRole("link", { name: number }).click();
  await expect(page.getByText("Client Admin E2E")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer (après appel)" }).click();
  await expect(page.getByRole("button", { name: "Passer en préparation" })).toBeVisible();
  await expect(page.locator("main")).toContainText(/F-\d{4}-\d{6}/);

  // The customer sees the new status.
  await page.goto(`/fr/track?number=${number}`);
  await page.locator("main").getByLabel("Téléphone").fill("0551234567");
  await page.locator("main").getByRole("button", { name: "Suivre" }).click();
  await expect(page.locator('main [aria-current="step"]')).toContainText("Confirmée");
});

test("catalog: publish a product, stock, printer compatibility, delivery and promo", async ({ page, browser }) => {
  await page.goto("/admin/products?status=draft");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Produits" })).toBeVisible();

  // No price: bulk publishing skips it.
  await page.locator('main input[name="id"]').first().check();
  await page.getByRole("button", { name: "Mettre en ligne" }).click();
  await expect(page.getByText(/1 ignoré\(s\) : prix manquant/)).toBeVisible();

  // Give it a price and publish it.
  await page.getByRole("link", { name: "Produit brouillon" }).click();
  await page.getByLabel("Prix de vente (DA)").fill("2500");
  await page.getByLabel("Statut").selectOption("active");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Produit enregistré.")).toBeVisible();
  await page.getByLabel("Quantité (+ entrée, − sortie)").fill("7");
  await page.getByRole("button", { name: "Enregistrer le mouvement" }).click();
  await expect(page.getByText("Stock mis à jour : 7 en stock.")).toBeVisible();

  // New printer, linked (verified) to the HP 59A toner.
  await page.goto("/admin/printers");
  await page.getByLabel("Marque", { exact: true }).selectOption({ label: "HP" });
  await page.getByLabel("Modèle", { exact: true }).fill("LaserJet Pro M428");
  await page.getByLabel("Type", { exact: true }).selectOption("multifunction");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText("Imprimante « LaserJet Pro M428 » ajoutée.")).toBeVisible();
  await page.goto("/admin/products?q=59a");
  await page.getByRole("link", { name: "Toner HP 59A noir" }).click();
  await page.getByLabel("Imprimante", { exact: true }).fill("HP LaserJet Pro M428 (hp-laserjet-pro-m428)");
  await page.getByRole("button", { name: "Lier l'imprimante" }).click();
  await expect(page.getByText(/LaserJet Pro M428 ajoutée \(vérifiée\)/)).toBeVisible();

  // Delivery for every wilaya, and a promo code.
  await page.goto("/admin/delivery");
  await page.getByLabel("Domicile DA").fill("650");
  await page.getByRole("button", { name: "Appliquer à toutes" }).first().click();
  await page.getByRole("button", { name: "Enregistrer les tarifs" }).click();
  await expect(page.getByText(/69 wilaya\(s\) ouvertes à la commande/)).toBeVisible();
  await page.goto("/admin/promos");
  await page.getByLabel("Code", { exact: true }).fill("rentree15");
  await page.getByLabel("Valeur").fill("15");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText("Code RENTREE15 créé.")).toBeVisible();

  // The storefront shows the changes (catalog pages are revalidated on save).
  const shop = await browser.newPage();
  await shop.goto("/fr/p/draft-product");
  await expect(shop.getByRole("heading", { level: 1 })).toHaveText("Produit brouillon");
  await shop.goto("/fr/find-your-ink/printer/hp-laserjet-pro-m428");
  await expect(shop.locator("main article")).toHaveCount(1);
  await shop.close();

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});
