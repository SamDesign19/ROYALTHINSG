import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Netlify's CDN ignores the query string in its cache key, so query-dependent API responses must
// never be cacheable by shared caches (regression: identical autocomplete for every query).
vi.mock("server-only", () => ({}));
vi.mock("@/features/search/queries", () => ({
  getSuggestions: async () => ({ products: [], printers: [], categories: [] }),
  searchProducts: async () => ({ items: [], total: 0, page: 1, pageCount: 1 }),
}));
vi.mock("@/features/checkout/queries", () => ({ getCommunes: async () => [] }));
vi.mock("@/features/compatibility/queries", () => ({
  getPrinterCatalog: async () => ({ series: [], printers: [] }),
  getPrinter: async () => null,
}));

const routes = {
  suggest: ["/api/suggest?q=toner", () => import("./suggest/route")],
  count: ["/api/search/count?origin=original", () => import("./search/count/route")],
  communes: ["/api/communes?wilaya=19", () => import("./communes/route")],
  printers: ["/api/printers?brand=canon", () => import("./printers/route")],
} as const;

describe("query-dependent API routes", () => {
  for (const [name, [url, load]] of Object.entries(routes)) {
    it(`${name} is not cacheable by a CDN`, async () => {
      const { GET } = await load();
      const res = await GET(new NextRequest(new URL(url, "http://localhost")));
      expect(res.status).toBe(200);
      const header = res.headers.get("cache-control") ?? "";
      expect(header).toContain("no-store");
      expect(header).not.toMatch(/public|s-maxage/);
    });
  }
});
