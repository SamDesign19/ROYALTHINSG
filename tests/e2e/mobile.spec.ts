import { expect, test } from "@playwright/test";

test("filter sheet shows a live result count and applies", async ({ page }) => {
  await page.goto("/en/search");
  await page.getByRole("button", { name: "Filters" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "Show 4 results" })).toBeVisible();
  await sheet.getByLabel("Original").check();
  await sheet.getByRole("button", { name: "Show 3 results" }).click();
  await expect(page).toHaveURL(/origin=original/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("main article")).toHaveCount(3);
});

test("menu and search overlay work on a phone, without horizontal scroll", async ({ page }) => {
  for (const path of ["/ar", "/fr/p/canon-057h-original", "/ar/search"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
  }
  await page.goto("/en");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Ink bottles" }).click();
  await expect(page).toHaveURL(/\/en\/c\/ink-bottles$/);

  await page.getByRole("button", { name: "Open search" }).click();
  await page.getByRole("dialog").getByRole("combobox").fill("057h");
  await page.getByRole("dialog").getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/\/en\/search\?q=057h$/);
});
