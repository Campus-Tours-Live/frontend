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
});
