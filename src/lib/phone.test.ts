import { describe, expect, it } from "vitest";
import { normalizeDzPhone } from "./phone";

// Mirrors normalize_dz_phone() in supabase/migrations/20261023000004_customers_delivery.sql.
describe("normalizeDzPhone", () => {
  it("accepts local and international formats, ignoring separators", () => {
    expect(normalizeDzPhone("0551234567")).toBe("0551234567");
    expect(normalizeDzPhone("0551 23 45 67")).toBe("0551234567");
    expect(normalizeDzPhone("+213 551-23-45-67")).toBe("0551234567");
    expect(normalizeDzPhone("00213551234567")).toBe("0551234567");
    expect(normalizeDzPhone("(036) 12.34.56")).toBe("036123456");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "12345", "0051234567", "05512345678901", "+33612345678", "055123456a"]) {
      expect(normalizeDzPhone(bad), bad).toBeNull();
    }
  });
});
