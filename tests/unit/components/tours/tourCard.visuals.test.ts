import {
  campusInitials,
  campusVisual,
  CAMPUS_CREST,
  languageLabel,
  majorGlyph,
  TINT,
  topicStyle,
  TOPIC_STYLE,
} from "@/components/tours/tourCard.visuals";

// TOPIC_STYLE / TINT / CAMPUS_CREST are only ever read internally (by topicStyle / campusVisual) —
// nothing outside this module imports the bindings directly by name. Reference them here so the
// module's exported const declarations themselves are exercised, not just the functions that close
// over them.
describe("exported style tables", () => {
  it("TOPIC_STYLE maps the known topic keys to a label/tagColor/icon/dot/text style", () => {
    expect(TOPIC_STYLE.GENERAL_CAMPUS.label).toBe("Campus life");
  });

  /**
   * Colour IS the topic key here — it drives the chip, the avatar tint and the duotone card behind,
   * so two topics sharing one reads as "same category" at a glance. Two pairs used to collide
   * (Academics & majors / For parents on purple, Dorms & housing / Transfer on blue), differing
   * only by ~5% mask opacity, which is imperceptible. The cause was structural rather than a typo:
   * eight topics were being fitted into the six non-semantic `TagColor`s (`red` reads as an error
   * and `gray` is taken by the unknown-topic fallback), so whoever wrote it had to double up.
   * Assert the invariant, not the two fixes — this is what catches the ninth topic.
   */
  it("gives every topic a colour no other topic uses", () => {
    const styles = Object.values(TOPIC_STYLE);
    for (const field of ["dot", "tagColor", "text", "tag"] as const) {
      const used = styles.map((s) => s[field]);
      expect(new Set(used).size).toBe(used.length);
    }
  });

  it("never reuses the fallback's grey for a real topic", () => {
    // Grey means "we don't know this topic". A real topic wearing it is indistinguishable from
    // one the frontend failed to recognise.
    for (const style of Object.values(TOPIC_STYLE)) {
      expect(style.tagColor).not.toBe("gray");
      expect(style.dot).not.toBe("bg-ink-soft");
    }
  });

  it("TINT exposes the three mask-opacity presets", () => {
    expect(TINT).toEqual({ subtle: "opacity-60", normal: "opacity-80", vivid: "opacity-100" });
  });

  it("CAMPUS_CREST starts as an empty curated-overrides map", () => {
    expect(CAMPUS_CREST).toEqual({});
  });
});

describe("topicStyle", () => {
  it("falls back to the generic 'Tour' style for an unknown or missing topic", () => {
    expect(topicStyle("SOME_UNMAPPED_TOPIC").label).toBe("Tour");
    expect(topicStyle(undefined).label).toBe("Tour");
    expect(topicStyle(null).label).toBe("Tour");
  });

  it("resolves a known topic to its style", () => {
    expect(topicStyle("GENERAL_CAMPUS").label).toBe("Campus life");
  });
});

describe("campusInitials", () => {
  it("takes the first letter of the first two significant words", () => {
    expect(campusInitials("North Coast University")).toBe("NC");
  });

  it("falls back to the first two characters of the name when it has no letters", () => {
    // A defensive edge case for backend data with no alphabetic content (e.g. an id-like name).
    expect(campusInitials("123 456")).toBe("12");
  });
});

describe("campusVisual", () => {
  it("is deterministic for the same input", () => {
    const a = campusVisual("u1", "North Coast University");
    const b = campusVisual("u1", "North Coast University");
    expect(a).toEqual(b);
  });

  it("falls back to hashing the university name when the id is empty", () => {
    // universityId can be blank in edge cases; the hash then keys off the name instead so the
    // same-named campus still maps to a stable crest colour.
    const first = campusVisual("", "Blue Ridge Institute");
    const second = campusVisual("", "Blue Ridge Institute");
    expect(first).toEqual(second);
    expect(first.crestColor).toEqual(expect.any(String));
  });
});

describe("majorGlyph", () => {
  it("matches a known major keyword", () => {
    expect(majorGlyph("Computer Science").icon).not.toBe(majorGlyph("General Studies").icon);
  });

  it("falls back to the default BookOpen glyph for an unmatched major", () => {
    const { icon, label } = majorGlyph("General Studies");
    expect(label).toBe("General Studies");
    // BookOpen is also the English/literature glyph — assert via a second unmatched major
    // instead of importing the icon directly, so this stays a black-box behavioral check.
    expect(icon).toBe(majorGlyph("Undeclared").icon);
  });
});

describe("languageLabel", () => {
  it("resolves a BCP-47 tag to its English name", () => {
    expect(languageLabel("en-US")).toBe("English");
    expect(languageLabel("zh")).toBe("Chinese");
  });

  it("returns the trimmed original tag when the primary subtag is empty", () => {
    expect(languageLabel("-US")).toBe("-US");
    expect(languageLabel("   ")).toBe("");
  });

  it("uppercases the code when Intl.DisplayNames rejects the subtag as malformed", () => {
    // A subtag made of digits is not a structurally valid BCP-47 language subtag, so
    // Intl.DisplayNames#of throws — languageLabel should degrade to the raw code.
    expect(languageLabel("123")).toBe("123");
  });

  it("degrades to the uppercased code when Intl.DisplayNames is unavailable in the environment", () => {
    const OriginalDisplayNames = Intl.DisplayNames;
    // @ts-expect-error -- deliberately breaking Intl.DisplayNames to exercise the module's
    // defensive module-init catch (some older/embedded JS engines lack this constructor).
    Intl.DisplayNames = class {
      constructor() {
        throw new Error("Intl.DisplayNames unsupported");
      }
    };
    jest.resetModules();
    try {
      // Re-import fresh so the module's top-level try/catch re-runs against the broken global.

      const fresh =
        require("@/components/tours/tourCard.visuals") as typeof import("@/components/tours/tourCard.visuals");
      expect(fresh.languageLabel("en-US")).toBe("EN");
    } finally {
      // @ts-expect-error -- restoring the real constructor after the deliberate break above.
      Intl.DisplayNames = OriginalDisplayNames;
      jest.resetModules();
    }
  });
});
