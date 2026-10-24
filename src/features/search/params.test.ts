import { describe, expect, it } from "vitest";
import { activeFilterCount, parseSearchParams, toSearchParams } from "./params";

describe("parseSearchParams", () => {
  it("defaults to popularity without a query and relevance with one", () => {
    expect(parseSearchParams({}).sort).toBe("popular");
    expect(parseSearchParams({ q: "057H" }).sort).toBe("relevance");
  });

  it("accepts repeated and comma-separated multi-values, dropping unknown enums", () => {
    const f = parseSearchParams({ type: ["toner", "ink_bottle,nope"], color: "black,cyan,black", brand: ["canon", "HP!"] });
    expect(f.types).toEqual(["toner", "ink_bottle"]);
    expect(f.colors).toEqual(["black", "cyan"]);
    expect(f.brands).toEqual(["canon"]);
  });

  it("drops malformed values instead of failing", () => {
    const f = parseSearchParams({ min: "abc", max: "-5", page: "0", origin: "fake", category: "../etc", sort: "drop table" });
    expect(f.minPrice).toBeNull();
    expect(f.maxPrice).toBeNull();
    expect(f.page).toBe(1);
    expect(f.origin).toBeNull();
    expect(f.category).toBeNull();
    expect(f.sort).toBe("popular");
  });

  it("parses prices, stock flag, printer slug and page", () => {
    const f = parseSearchParams({ min: "1000", max: "7000", stock: "1", printer: "canon-i-sensys-mf443dw", page: "3" });
    expect(f).toMatchObject({ minPrice: 1000, maxPrice: 7000, inStock: true, printer: "canon-i-sensys-mf443dw", page: 3 });
  });

  it("trims and bounds the query", () => {
    expect(parseSearchParams({ q: "   " }).q).toBeNull();
    expect(parseSearchParams({ q: "x".repeat(500) }).q).toHaveLength(120);
  });
});

describe("toSearchParams", () => {
  it("round-trips through parseSearchParams and omits defaults", () => {
    const f = parseSearchParams({ q: "toner", brand: ["canon", "hp"], origin: "compatible", stock: "1", sort: "price_asc", page: "2" });
    const qs = toSearchParams(f);
    expect(qs.toString()).toBe("q=toner&brand=canon&brand=hp&origin=compatible&stock=1&sort=price_asc&page=2");
    const back = parseSearchParams(Object.fromEntries([...new Set(qs.keys())].map((k) => [k, qs.getAll(k)])));
    expect(back).toEqual(f);
    expect(toSearchParams(parseSearchParams({})).toString()).toBe("");
  });
});

describe("activeFilterCount", () => {
  it("counts every chosen value but not query, sort or page", () => {
    expect(activeFilterCount(parseSearchParams({ q: "x", sort: "newest", page: "2" }))).toBe(0);
    expect(activeFilterCount(parseSearchParams({ brand: ["a", "b"], color: "black", min: "10", stock: "1" }))).toBe(5);
  });
});
