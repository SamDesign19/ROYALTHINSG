import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the local stack (scripts/local-stack.sh up), which loads the
// TEST-ONLY fixtures from tests/db/02_fixtures.sql, and a production build (`npm run build`).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/fr",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
