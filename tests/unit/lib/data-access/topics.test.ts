import { canonicalizeTopicIds } from "@/lib/data-access/topics";

const ALL = ["GENERAL_CAMPUS", "DORM_HOUSING", "DINING_STUDENT_LIFE"]; // stand-in vocab for the test

it("dedupes, drops unknown, and orders by the vocab", () => {
  expect(
    canonicalizeTopicIds(["DORM_HOUSING", "DORM_HOUSING", "NOPE", "GENERAL_CAMPUS"], ALL),
  ).toEqual(["GENERAL_CAMPUS", "DORM_HOUSING"]);
});

it("collapses empty and full-set (even with duplicates) to []", () => {
  expect(canonicalizeTopicIds([], ALL)).toEqual([]);
  expect(canonicalizeTopicIds([...ALL, "GENERAL_CAMPUS"], ALL)).toEqual([]);
});
