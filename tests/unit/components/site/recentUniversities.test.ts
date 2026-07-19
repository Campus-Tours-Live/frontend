import { readRecentUniversities, pushRecentUniversity } from "@/components/site/recentUniversities";

beforeEach(() => localStorage.clear());

describe("recentUniversities", () => {
  it("returns [] when nothing stored", () => {
    expect(readRecentUniversities()).toEqual([]);
  });

  it("stores most-recent-first, de-duplicated, capped at 5", () => {
    ["A", "B", "C", "D", "E", "F"].forEach(pushRecentUniversity);
    pushRecentUniversity("C"); // move C to front, no duplicate
    const recent = readRecentUniversities();
    expect(recent[0]).toBe("C");
    expect(recent).toHaveLength(5);
    expect(recent.filter((n) => n === "C")).toHaveLength(1);
    expect(recent).not.toContain("A"); // evicted (oldest)
  });

  it("ignores blank names and malformed storage", () => {
    pushRecentUniversity("  ");
    expect(readRecentUniversities()).toEqual([]);
    localStorage.setItem("cttl:recent-universities", "not json");
    expect(readRecentUniversities()).toEqual([]);
  });

  it("returns [] when stored JSON is valid but not an array (wrong shape)", () => {
    localStorage.setItem("cttl:recent-universities", JSON.stringify({ not: "an array" }));
    expect(readRecentUniversities()).toEqual([]);
  });

  it("filters out non-string entries from an otherwise-valid stored array", () => {
    localStorage.setItem(
      "cttl:recent-universities",
      JSON.stringify(["Real U", 123, null, { x: 1 }, "Another U"]),
    );
    expect(readRecentUniversities()).toEqual(["Real U", "Another U"]);
  });

  it("is a no-op on the server (no `window`) for both read and write", () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    // @ts-expect-error deliberately simulating an SSR environment where `window` is absent.
    delete globalThis.window;
    try {
      expect(typeof window).toBe("undefined");
      expect(readRecentUniversities()).toEqual([]);
      expect(() => pushRecentUniversity("SSR U")).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "window", windowDescriptor!);
    }
    // Confirm push was skipped entirely (not just non-throwing) — storage still empty
    // once `window` is back.
    expect(readRecentUniversities()).toEqual([]);
  });

  it("recovers gracefully when localStorage.getItem throws", () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    try {
      expect(readRecentUniversities()).toEqual([]);
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it("does not throw when localStorage.setItem throws (storage disabled/full)", () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    try {
      expect(() => pushRecentUniversity("Quota U")).not.toThrow();
    } finally {
      setItemSpy.mockRestore();
    }
    // setItem never actually succeeded, so nothing was persisted.
    expect(readRecentUniversities()).toEqual([]);
  });
});
