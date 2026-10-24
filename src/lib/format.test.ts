import { describe, expect, it } from "vitest";
import { discountPercent, formatAmount, formatDZD } from "./format";

describe("formatDZD", () => {
  it("uses Latin digits, narrow no-break space grouping and a per-language suffix", () => {
    expect(formatDZD(18000, "fr")).toBe("18 000 DA");
    expect(formatDZD(18000, "en")).toBe("18 000 DA");
    expect(formatDZD(18000, "ar")).toBe("18 000 د.ج");
  });

  it("keeps centimes only when present and accepts numeric strings from the database", () => {
    expect(formatAmount(1800)).toBe("1 800");
    expect(formatAmount("6500.50")).toBe("6 500,5");
    expect(formatAmount(1234567)).toBe("1 234 567");
  });
});

describe("discountPercent", () => {
  it("returns the rounded saving only for a real reduction", () => {
    expect(discountPercent(7500, 10000)).toBe(25);
    expect(discountPercent(10000, 10000)).toBeNull();
    expect(discountPercent(10000, 9000)).toBeNull();
    expect(discountPercent(10000, null)).toBeNull();
  });
});
