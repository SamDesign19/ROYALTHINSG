import { describe, expect, it } from "vitest";
import { addItem, cartCount, MAX_LINES, MAX_QUANTITY, parseCart, serializeCart, setItem } from "./cookie";

const A = "40000000-0000-0000-0000-000000000001";
const B = "40000000-0000-0000-0000-000000000002";

describe("cart cookie", () => {
  it("round-trips through serialize/parse", () => {
    const items = [{ id: A, qty: 2 }, { id: B, qty: 1 }];
    expect(parseCart(serializeCart(items))).toEqual(items);
    expect(parseCart(encodeURIComponent(serializeCart(items)))).toEqual(items); // as seen in document.cookie
    expect(cartCount(items)).toBe(3);
  });

  it("drops tampered or malformed values instead of failing", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart(encodeURIComponent(JSON.stringify([["not-a-uuid", 1]])))).toEqual([]);
    expect(parseCart(encodeURIComponent(JSON.stringify([[A, 0]])))).toEqual([]);
    expect(parseCart(encodeURIComponent(JSON.stringify([[A, MAX_QUANTITY + 1]])))).toEqual([]);
    expect(parseCart(encodeURIComponent(JSON.stringify([[A, 1.5]])))).toEqual([]);
  });

  it("keeps the first of duplicate lines", () => {
    expect(parseCart(encodeURIComponent(JSON.stringify([[A, 2], [A, 5]])))).toEqual([{ id: A, qty: 2 }]);
  });

  it("adds, merges and caps quantities; new lines go first; line count is bounded", () => {
    let items = addItem([], A, 1);
    items = addItem(items, B, 2);
    expect(items.map((i) => i.id)).toEqual([B, A]);
    items = addItem(items, A, 200);
    expect(items.find((i) => i.id === A)?.qty).toBe(MAX_QUANTITY);
    const many = Array.from({ length: MAX_LINES }, (_, i) => ({ id: `40000000-0000-0000-0000-${String(i).padStart(12, "0")}`, qty: 1 }));
    expect(addItem(many, A, 1)).toHaveLength(MAX_LINES);
  });

  it("sets quantities and removes a line at 0", () => {
    const items = [{ id: A, qty: 2 }, { id: B, qty: 1 }];
    expect(setItem(items, A, 5)).toEqual([{ id: A, qty: 5 }, { id: B, qty: 1 }]);
    expect(setItem(items, A, 0)).toEqual([{ id: B, qty: 1 }]);
  });
});
