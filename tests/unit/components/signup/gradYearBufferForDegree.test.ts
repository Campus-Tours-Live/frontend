import { gradYearBufferForDegree } from "@/components/signup/classYear";

// The form only ever selects a couple of degrees, so cover every bucket directly here.
describe("gradYearBufferForDegree", () => {
  it.each([
    ["Doctoral degree", 9],
    ["First professional degree", 9],
    ["Master's degree", 3],
    ["Post-baccalaureate certificate", 3],
    ["Bachelor's Degree", 6],
    ["Associate's degree", 3],
    ["Undergraduate certificate", 3],
    ["Diploma", 3],
    ["", 8],
    ["Some unrecognized credential", 8],
  ] as const)("maps %s → +%d years", (degree, expected) => {
    expect(gradYearBufferForDegree(degree)).toBe(expected);
  });

  it("treats an undefined degree as the generous default", () => {
    expect(gradYearBufferForDegree(undefined)).toBe(8);
  });
});
