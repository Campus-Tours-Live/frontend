import { NAME_MAX_LENGTH, sanitizeName, validateName } from "@/lib/validation/name";

describe("sanitizeName", () => {
  it("strips characters that aren't letters, spaces, hyphens, apostrophes, or periods", () => {
    expect(sanitizeName("John5 O'Br@ien-Doe.")).toBe("John O'Brien-Doe.");
  });

  it("keeps unicode letters (accents, CJK)", () => {
    expect(sanitizeName("José 李")).toBe("José 李");
  });

  it("caps the length at NAME_MAX_LENGTH", () => {
    expect(sanitizeName("a".repeat(NAME_MAX_LENGTH + 20))).toHaveLength(NAME_MAX_LENGTH);
  });
});

describe("validateName", () => {
  it("allows empty / whitespace-only (emptiness is the required rule's job)", () => {
    expect(validateName("")).toBe(true);
    expect(validateName("   ")).toBe(true);
  });

  it("rejects a name longer than the max", () => {
    expect(validateName("a".repeat(NAME_MAX_LENGTH + 1))).toMatch(/50 characters or fewer/i);
  });

  it("rejects disallowed characters", () => {
    expect(validateName("John5")).toMatch(/only letters/i);
  });

  it("rejects a name with no letter at all", () => {
    expect(validateName("- .")).toMatch(/only letters/i);
  });

  it("accepts a valid name with allowed punctuation", () => {
    expect(validateName("Mary-Jane O'Neil")).toBe(true);
  });
});
