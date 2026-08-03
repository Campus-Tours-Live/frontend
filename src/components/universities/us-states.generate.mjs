import { readFileSync, writeFileSync } from "node:fs";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";

/**
 * Generates us-states-map.svg from US Census Bureau cartographic boundary data
 * (via us-atlas states-10m, public domain), NOT from memory.
 *
 * Projection: geoAlbersUsa — the standard composite that places Alaska at the
 * lower left and Hawaii to its right, already at a sane relative scale.
 */

// FIPS -> [USPS, name]. The 50 states plus DC; no territories (60/66/69/72/78).
const STATES = {
  "01": ["AL", "Alabama"],
  "02": ["AK", "Alaska"],
  "04": ["AZ", "Arizona"],
  "05": ["AR", "Arkansas"],
  "06": ["CA", "California"],
  "08": ["CO", "Colorado"],
  "09": ["CT", "Connecticut"],
  10: ["DE", "Delaware"],
  11: ["DC", "District of Columbia"],
  12: ["FL", "Florida"],
  13: ["GA", "Georgia"],
  15: ["HI", "Hawaii"],
  16: ["ID", "Idaho"],
  17: ["IL", "Illinois"],
  18: ["IN", "Indiana"],
  19: ["IA", "Iowa"],
  20: ["KS", "Kansas"],
  21: ["KY", "Kentucky"],
  22: ["LA", "Louisiana"],
  23: ["ME", "Maine"],
  24: ["MD", "Maryland"],
  25: ["MA", "Massachusetts"],
  26: ["MI", "Michigan"],
  27: ["MN", "Minnesota"],
  28: ["MS", "Mississippi"],
  29: ["MO", "Missouri"],
  30: ["MT", "Montana"],
  31: ["NE", "Nebraska"],
  32: ["NV", "Nevada"],
  33: ["NH", "New Hampshire"],
  34: ["NJ", "New Jersey"],
  35: ["NM", "New Mexico"],
  36: ["NY", "New York"],
  37: ["NC", "North Carolina"],
  38: ["ND", "North Dakota"],
  39: ["OH", "Ohio"],
  40: ["OK", "Oklahoma"],
  41: ["OR", "Oregon"],
  42: ["PA", "Pennsylvania"],
  44: ["RI", "Rhode Island"],
  45: ["SC", "South Carolina"],
  46: ["SD", "South Dakota"],
  47: ["TN", "Tennessee"],
  48: ["TX", "Texas"],
  49: ["UT", "Utah"],
  50: ["VT", "Vermont"],
  51: ["VA", "Virginia"],
  53: ["WA", "Washington"],
  54: ["WV", "West Virginia"],
  55: ["WI", "Wisconsin"],
  56: ["WY", "Wyoming"],
};

const WIDTH = 1200;
const HEIGHT = 760;
// Alaska and Hawaii are separate <g> insets in the output; geoAlbersUsa already
// positions them, so the groups are structural (for styling/targeting), not transforms.
const AK = "02";
const HI = "15";

const topo = JSON.parse(readFileSync("states-10m.json", "utf8"));
const fc = feature(topo, topo.objects.states);

const wanted = fc.features.filter((f) => STATES[f.id]);
if (wanted.length !== 51) throw new Error(`expected 50 states + DC, got ${wanted.length}`);

// Fit the composite to the viewBox with a small margin so strokes are not clipped.
const projection = geoAlbersUsa().fitExtent(
  [
    [12, 12],
    [WIDTH - 12, HEIGHT - 12],
  ],
  { type: "FeatureCollection", features: wanted },
);

// 2 decimals: sub-pixel at this size, and it roughly halves the file.
const path = geoPath(projection).digits(1);

function pathFor(f) {
  const d = path(f);
  if (!d) throw new Error(`no path data for ${f.id}`);
  return d;
}

function stateEl(f) {
  const [code, name] = STATES[f.id];
  return [
    `    <path`,
    `      id="${code}"`,
    `      class="state"`,
    `      data-state-code="${code}"`,
    `      data-state-name="${name}"`,
    `      tabindex="0"`,
    `      role="button"`,
    `      aria-label="${name}"`,
    `      d="${pathFor(f)}"`,
    `    ><title>${name}</title></path>`,
  ].join("\n");
}

const byId = (id) => wanted.find((f) => f.id === id);
const contiguous = wanted
  .filter((f) => f.id !== AK && f.id !== HI)
  .sort((a, b) => STATES[a.id][0].localeCompare(STATES[b.id][0]));

// Centroid in projected (viewBox) space — where the hover pin is anchored. geoPath.centroid
// handles multi-polygon states by area weighting, so Michigan's pin lands on the Lower
// Peninsula rather than in the lake between the two.
function bboxFor(f) {
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  return [x0, y0, x1, y1].map((n) => Math.round(n * 10) / 10);
}

function centroidFor(f) {
  const [x, y] = path.centroid(f);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`no centroid for ${f.id}`);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const ordered = [...wanted].sort((a, b) => STATES[a.id][0].localeCompare(STATES[b.id][0]));

const rows = ordered
  .map((f) => {
    const [code, name] = STATES[f.id];
    const [cx, cy] = centroidFor(f);
    const [x0, y0, x1, y1] = bboxFor(f);
    const inset = f.id === AK ? "alaska" : f.id === HI ? "hawaii" : "contiguous";
    return `  { code: "${code}", name: "${name}", inset: "${inset}", cx: ${cx}, cy: ${cy}, bbox: [${x0}, ${y0}, ${x1}, ${y1}], d: "${pathFor(f)}" },`;
  })
  .join("\n");

const ts = `/**
 * GENERATED — do not edit by hand.
 *
 * Source: US Census Bureau cartographic boundary files, via the public-domain \`us-atlas\`
 * \`states-10m\` TopoJSON. Projected with d3-geo's \`geoAlbersUsa\`, the standard composite that
 * places Alaska at the lower left and Hawaii to its right at a sane relative scale.
 *
 * Regenerate with the script in the SDD scratchpad rather than editing coordinates here. Neither
 * d3-geo nor topojson-client is a dependency of this app — they run at generation time only, so
 * this module is plain data with no runtime cost beyond its own bytes.
 *
 * Coordinates are in the viewBox space below; \`cx\`/\`cy\` are area-weighted centroids, used to
 * anchor the hover pin.
 */

export const US_MAP_VIEWBOX = { width: ${WIDTH}, height: ${HEIGHT} } as const;

/** Which composite inset a state is drawn in — the two non-contiguous states get their own group. */
export type UsMapInset = "contiguous" | "alaska" | "hawaii";

export interface UsState {
  /** Two-letter USPS code, unique. */
  code: string;
  name: string;
  inset: UsMapInset;
  /** Centroid x in viewBox units. */
  cx: number;
  /** Centroid y in viewBox units. */
  cy: number;
  /** [minX, minY, maxX, maxY] in viewBox units — sizes the flag that fills the shape on hover. */
  bbox: readonly [number, number, number, number];
  /** SVG path data. */
  d: string;
}

export const US_STATES: readonly UsState[] = [
${rows}
];
`;

writeFileSync("us-states.generated.ts", ts);

// ---- checks from the brief ----
const codes = ordered.map((f) => STATES[f.id][0]);
const problems = [];
if (codes.length !== 51)
  problems.push(`entry count is ${codes.length}, expected 51 (50 states + DC)`);
if (new Set(codes).size !== 51) problems.push("duplicate codes");
if (!codes.includes("DC")) problems.push("District of Columbia missing");
for (const t of ["PR", "GU", "VI", "AS", "MP"])
  if (codes.includes(t)) problems.push(`territory ${t} present`);
if (ts.includes('d: ""')) problems.push("empty path data");

const subpaths = (code) => {
  const f = ordered.find((x) => STATES[x.id][0] === code);
  return (pathFor(f).match(/M/g) || []).length;
};
for (const [code, min] of [
  ["MI", 2],
  ["HI", 4],
  ["NY", 2],
  ["FL", 1],
]) {
  if (subpaths(code) < min)
    problems.push(`${code} has ${subpaths(code)} subpaths, expected >= ${min}`);
}
const insets = ordered.reduce((a, f) => {
  const i = f.id === AK ? "alaska" : f.id === HI ? "hawaii" : "contiguous";
  a[i] = (a[i] || 0) + 1;
  return a;
}, {});

console.log(`  states: ${codes.length} unique: ${new Set(codes).size}`);
console.log(`  insets:`, insets);
console.log(
  `  MI ${subpaths("MI")} subpaths, HI ${subpaths("HI")}, NY ${subpaths("NY")}, FL ${subpaths("FL")}`,
);
console.log(`  module size: ${(ts.length / 1024).toFixed(0)} KB`);
console.log(problems.length ? `  PROBLEMS: ${problems.join("; ")}` : "  all checks passed");
