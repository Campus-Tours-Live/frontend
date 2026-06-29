import { queryKeys } from "@/lib/data-access/keys";

describe("queryKeys", () => {
  describe("zero-arg factories return exact tuples", () => {
    it("me() → ['me']", () => {
      expect(queryKeys.me()).toEqual(["me"]);
    });

    it("participantProfile() → ['participant-profile']", () => {
      expect(queryKeys.participantProfile()).toEqual(["participant-profile"]);
    });

    it("guideProfile() → ['guide-profile']", () => {
      expect(queryKeys.guideProfile()).toEqual(["guide-profile"]);
    });

    it("tourTopics() → ['tour-topics']", () => {
      expect(queryKeys.tourTopics()).toEqual(["tour-topics"]);
    });

    it("dashboard() → ['dashboard']", () => {
      expect(queryKeys.dashboard()).toEqual(["dashboard"]);
    });

    it("guideOfferings() → ['guide-offerings']", () => {
      expect(queryKeys.guideOfferings()).toEqual(["guide-offerings"]);
    });
  });

  describe("universitySearch(q)", () => {
    it("returns ['university-search', q]", () => {
      expect(queryKeys.universitySearch("mit")).toEqual(["university-search", "mit"]);
    });

    it("varies by q", () => {
      expect(queryKeys.universitySearch("mit")).not.toEqual(queryKeys.universitySearch("yale"));
    });

    it("handles an empty query string", () => {
      expect(queryKeys.universitySearch("")).toEqual(["university-search", ""]);
    });

    it("preserves the exact query value", () => {
      expect(queryKeys.universitySearch("New York University")).toEqual([
        "university-search",
        "New York University",
      ]);
    });
  });

  describe("onboarding(role)", () => {
    it("returns ['onboarding', role]", () => {
      expect(queryKeys.onboarding("guide")).toEqual(["onboarding", "guide"]);
    });

    it("varies by role", () => {
      expect(queryKeys.onboarding("guide")).not.toEqual(queryKeys.onboarding("participant"));
    });

    it("preserves the exact role value", () => {
      expect(queryKeys.onboarding("participant")).toEqual(["onboarding", "participant"]);
    });
  });

  describe("referential shape", () => {
    const factories: Array<[string, () => readonly unknown[]]> = [
      ["me", () => queryKeys.me()],
      ["participantProfile", () => queryKeys.participantProfile()],
      ["guideProfile", () => queryKeys.guideProfile()],
      ["tourTopics", () => queryKeys.tourTopics()],
      ["dashboard", () => queryKeys.dashboard()],
      ["guideOfferings", () => queryKeys.guideOfferings()],
      ["universitySearch", () => queryKeys.universitySearch("x")],
      ["onboarding", () => queryKeys.onboarding("x")],
    ];

    it.each(factories)("%s returns an array", (_name, factory) => {
      expect(Array.isArray(factory())).toBe(true);
    });

    it("returns a fresh array instance on each call", () => {
      expect(queryKeys.me()).not.toBe(queryKeys.me());
      expect(queryKeys.me()).toEqual(queryKeys.me());
    });

    it("different factories produce different keys", () => {
      const keys = [
        queryKeys.me(),
        queryKeys.participantProfile(),
        queryKeys.guideProfile(),
        queryKeys.tourTopics(),
        queryKeys.dashboard(),
        queryKeys.guideOfferings(),
        queryKeys.universitySearch("x"),
        queryKeys.onboarding("x"),
      ];
      const serialized = keys.map((k) => JSON.stringify(k));
      expect(new Set(serialized).size).toBe(keys.length);
    });
  });
});
