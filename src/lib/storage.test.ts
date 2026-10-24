import { afterEach, describe, expect, it, vi } from "vitest";
import { publicStorageUrl } from "./storage";

describe("publicStorageUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds a public object URL with encoded segments", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    expect(publicStorageUrl("product-images", "/canon/057h front.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/product-images/canon/057h%20front.jpg",
    );
  });

  it("passes absolute URLs through and returns null without a path", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    expect(publicStorageUrl("banners", "https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(publicStorageUrl("banners", null)).toBeNull();
  });
});
