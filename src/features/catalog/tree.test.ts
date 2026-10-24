import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/supabase", () => ({ createPublicClient: () => { throw new Error("not used"); } }));

const { buildCategoryTree } = await import("./queries");

describe("buildCategoryTree", () => {
  it("nests children under parents and keeps order; orphans of inactive parents are dropped", () => {
    const c = (id: string, parent_id: string | null) => ({ id, parent_id, slug: id, name: { fr: id }, description: null, image_path: null, sort_order: 0 });
    const tree = buildCategoryTree([c("ink", null), c("bottles", "ink"), c("toner", "ink"), c("paper", null), c("orphan", "inactive")]);
    expect(tree.map((n) => n.id)).toEqual(["ink", "paper"]);
    expect(tree[0]!.children.map((n) => n.id)).toEqual(["bottles", "toner"]);
  });
});
