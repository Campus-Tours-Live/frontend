import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOPIC_STYLE } from "@/components/tours/tourCard.visuals";

/**
 * Measures how far apart the tour-topic colours actually are, against the real tokens.
 *
 * WHY THIS EXISTS. Two topics once rendered in the same purple, and a "no two topics share a class
 * name" assertion would have passed the whole time — the classes differed, the colours did not.
 * String identity is the wrong instrument: what a user notices is perceptual distance, so that is
 * what gets measured here, in OKLab, against `globals.css` rather than a copy of the values.
 *
 * At the point this was written the closest pair sat at ΔE 0.020, which is not "similar" — it is
 * the same colour twice. The cause was structural: topics borrowed six semantic tokens (`primary`,
 * `success`, `warning`, `sage`, `coral`, `purple`) for eight categories, and those tokens were each
 * chosen for an unrelated job, never to be told apart from each other.
 *
 * The threshold is deliberately below the ~0.15 quoted for identifying an isolated swatch: colour
 * is not the only signal on the card — every topic also carries its own icon and its own text
 * label — so the bar is "clearly not the same colour", not "identifiable blind".
 */
const MIN_DISTANCE = 0.11;

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Read an `--topic-*` token straight from the stylesheet, so the test cannot drift from shipped CSS. */
function token(name: string): [number, number, number] {
  const match = CSS.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!match) throw new Error(`token --${name} is missing from globals.css`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const seg: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = seg[Math.floor((h % 360) / 60)];
  return [r + m, g + m, b + m];
}

/** OKLab — a perceptually uniform space, so Euclidean distance tracks what the eye reports. */
function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Each topic's colour family name, taken from its `dot` class (`bg-mauve` → `mauve`). */
const families = Object.entries(TOPIC_STYLE).map(([key, style]) => ({
  key,
  family: style.dot.replace("bg-", ""),
}));

describe("tour topic colours", () => {
  it.each([
    ["dot (avatar + duotone)", (f: string) => `topic-${f}`],
    ["chip fill (the label the user reads)", (f: string) => `topic-${f}-foreground`],
  ])("keeps every pair of %s perceptually apart", (_label, tokenFor) => {
    const points = families.map((f) => ({
      key: f.key,
      lab: oklab(hslToRgb(token(tokenFor(f.family)))),
    }));

    const tooClose: string[] = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const d = distance(points[i].lab, points[j].lab);
        if (d < MIN_DISTANCE)
          tooClose.push(`${points[i].key} ↔ ${points[j].key} (ΔE ${d.toFixed(3)})`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  /**
   * The chip is `Tag variant="inverse"` — ivory text on the `-foreground` fill — so this fill is
   * carrying real text and owes it WCAG 1.4.3 contrast. Easy to miss: the `-foreground` name
   * suggests it is itself the text colour, and here it is the background.
   */
  it("keeps ivory chip text legible on every topic fill", () => {
    const ivory = hslToRgb(token("brand-ivory"));
    for (const { key, family } of families) {
      const fill = hslToRgb(token(`topic-${family}-foreground`));
      const [hi, lo] = [relativeLuminance(ivory), relativeLuminance(fill)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      expect({ key, ratio: ratio >= 4.5 }).toEqual({ key, ratio: true });
    }
  });

  it("gives every topic its own colour family", () => {
    const used = families.map((f) => f.family);
    expect(new Set(used).size).toBe(used.length);
  });
});
