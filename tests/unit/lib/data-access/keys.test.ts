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

    it("availabilityRules() → ['availability-rules']", () => {
      expect(queryKeys.availabilityRules()).toEqual(["availability-rules"]);
    });

    it("availabilityExceptions() → ['availability-exceptions']", () => {
      expect(queryKeys.availabilityExceptions()).toEqual(["availability-exceptions"]);
    });

    it("availabilitySettings() → ['availability-settings']", () => {
      expect(queryKeys.availabilitySettings()).toEqual(["availability-settings"]);
    });

    it("availabilityResolved() → ['availability-resolved']", () => {
      expect(queryKeys.availabilityResolved()).toEqual(["availability-resolved"]);
    });
  });

  describe("offeringSlots(offeringId)", () => {
    it("returns ['offering-slots', offeringId]", () => {
      expect(queryKeys.offeringSlots("o1")).toEqual(["offering-slots", "o1"]);
    });

    it("varies by offeringId", () => {
      expect(queryKeys.offeringSlots("o1")).not.toEqual(queryKeys.offeringSlots("o2"));
    });
  });

  describe("availabilityPreview(params)", () => {
    const params = {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-03",
      kind: "UNAVAILABLE" as const,
      startLocal: "09:30",
      windowMin: 90,
    };

    it("returns ['availability-preview', params]", () => {
      expect(queryKeys.availabilityPreview(params)).toEqual(["availability-preview", params]);
    });

    it("returns ['availability-preview', null] when params is null", () => {
      expect(queryKeys.availabilityPreview(null)).toEqual(["availability-preview", null]);
    });

    it("varies by params", () => {
      expect(queryKeys.availabilityPreview(params)).not.toEqual(
        queryKeys.availabilityPreview(null),
      );
      expect(queryKeys.availabilityPreview(params)).not.toEqual(
        queryKeys.availabilityPreview({ ...params, windowMin: 60 }),
      );
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
      ["availabilityRules", () => queryKeys.availabilityRules()],
      ["availabilityExceptions", () => queryKeys.availabilityExceptions()],
      ["availabilitySettings", () => queryKeys.availabilitySettings()],
      ["availabilityResolved", () => queryKeys.availabilityResolved()],
      ["offeringSlots", () => queryKeys.offeringSlots("x")],
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
        queryKeys.availabilityRules(),
        queryKeys.availabilityExceptions(),
        queryKeys.availabilitySettings(),
        queryKeys.availabilityResolved(),
        queryKeys.offeringSlots("x"),
      ];
      const serialized = keys.map((k) => JSON.stringify(k));
      expect(new Set(serialized).size).toBe(keys.length);
    });
  });
});
