import {
  bucketOccurrencesByDate,
  isoDateInTimeZone,
  partsInTimeZone,
} from "@/lib/availability/bucketByDate";

describe("isoDateInTimeZone", () => {
  it("resolves a mid-day UTC instant to the same calendar date in a negative-offset zone", () => {
    // 2026-07-10T14:00:00Z is 09:00 America/Chicago (UTC-5 in July) — same calendar date.
    expect(isoDateInTimeZone(new Date("2026-07-10T14:00:00Z"), "America/Chicago")).toBe(
      "2026-07-10",
    );
  });

  it("buckets a settings-tz BOUNDARY-CROSSING instant to the settings-tz date, not the UTC date", () => {
    // 2026-07-06T02:00:00Z is 21:00 on 2026-07-05 in America/Chicago (UTC-5 in July) — the UTC
    // calendar date (07-06) and the settings-tz calendar date (07-05) differ. This must bucket
    // to the settings-tz date.
    expect(isoDateInTimeZone(new Date("2026-07-06T02:00:00Z"), "America/Chicago")).toBe(
      "2026-07-05",
    );
  });
});

describe("partsInTimeZone", () => {
  it("extracts {year, month, day} as seen in the given timezone", () => {
    expect(partsInTimeZone(new Date("2026-07-06T02:00:00Z"), "America/Chicago")).toEqual({
      year: 2026,
      month: 7,
      day: 5,
    });
  });
});

describe("bucketOccurrencesByDate", () => {
  it("groups occurrences by settings-tz calendar date, sorted by startAt", () => {
    const map = bucketOccurrencesByDate(
      [
        { startAt: "2026-07-10T15:00:00Z", endAt: "2026-07-10T16:00:00Z" },
        { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T15:00:00Z" },
      ],
      "America/Chicago",
    );

    expect(Array.from(map.keys())).toEqual(["2026-07-10"]);
    expect(map.get("2026-07-10")?.map((o) => o.startAt)).toEqual([
      "2026-07-10T14:00:00Z",
      "2026-07-10T15:00:00Z",
    ]);
  });

  it("buckets a tz BOUNDARY-CROSSING occurrence (UTC calendar date differs from settings-tz date) into the settings-tz date's bucket, not the UTC/runner-local date", () => {
    // Same fixture as the isoDateInTimeZone boundary test above: the UTC instant is on 07-06 but
    // the settings-tz (America/Chicago) calendar date is 07-05 — this must land in the "2026-07-05"
    // bucket, never a "2026-07-06" bucket.
    const map = bucketOccurrencesByDate(
      [{ startAt: "2026-07-06T02:00:00Z", endAt: "2026-07-06T03:00:00Z" }],
      "America/Chicago",
    );

    expect(Array.from(map.keys())).toEqual(["2026-07-05"]);
    expect(map.has("2026-07-06")).toBe(false);
  });

  it("returns an empty map for no occurrences", () => {
    expect(bucketOccurrencesByDate([], "America/Chicago").size).toBe(0);
  });
});
