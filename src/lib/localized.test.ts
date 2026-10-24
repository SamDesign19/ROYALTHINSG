import { describe, expect, it } from "vitest";
import { pick } from "./localized";

describe("pick", () => {
  it("returns the requested language", () => {
    expect(pick({ ar: "أسود", fr: "Noir", en: "Black" }, "ar")).toBe("أسود");
  });
  it("falls back to French, then English, then Arabic", () => {
    expect(pick({ fr: "Noir", en: "Black" }, "ar")).toBe("Noir");
    expect(pick({ en: "Black", ar: "أسود" }, "fr")).toBe("Black");
    expect(pick({ ar: "أسود" }, "en")).toBe("أسود");
    expect(pick({ ar: "  ", fr: "Noir" }, "ar")).toBe("Noir");
  });
  it("handles missing values", () => {
    expect(pick(null, "fr")).toBe("");
    expect(pick({}, "fr")).toBe("");
  });
});
