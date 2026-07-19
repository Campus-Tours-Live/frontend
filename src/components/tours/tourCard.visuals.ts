import {
  ArrowRightLeft,
  Atom,
  BedDouble,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  Church,
  Code2,
  Cog,
  Dna,
  Drama,
  Dumbbell,
  Film,
  FlaskConical,
  Globe,
  GraduationCap,
  HardHat,
  Landmark,
  Languages,
  Leaf,
  MapPin,
  Megaphone,
  Music,
  Palette,
  Plane,
  Scale,
  Shield,
  Sigma,
  Sparkles,
  Sprout,
  Stethoscope,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { TagColor } from "@/components/ui";

/**
 * Visual mapping for {@link TourProductCard}: turns raw backend fields (topic / universityId /
 * universityName / major) into the card's three glance-level channels —
 *   topic  → COLOUR   (a soft brand-token mask over the campus photo + pill + tags)
 *   campus → PHOTO    (a per-university image, with a deterministic brand gradient as fallback)
 *   major  → ICON     (a field-of-study glyph)
 * Each is orthogonal, so a list filtered to one dimension never becomes look-alikes.
 *
 * Add a university/topic/major by adding one row here — no component changes.
 */

/* ------------------------------------------------------------------ topic → colour */

export interface TopicStyle {
  label: string;
  /** A distinct glyph per topic — the strongest at-a-glance differentiator between same-campus cards. */
  icon: LucideIcon;
  /** Leading dot on the pill + guide avatar tint. */
  dot: string;
  /** A deep, white-text-legible fill — the card's topic accent bar + the body chip. */
  solid: string;
  /** Pill text colour. */
  text: string;
  /** Soft tag chip (bg + text). */
  tag: string;
  /** The {@link TagColor} matching `tag` — lets the soft topic tags reuse the shared Tag component. */
  tagColor: TagColor;
  /** Full-image colour mask — a diagonal gradient in the topic hue, kept translucent so the
   *  campus photo still reads. Tuned soft to match the brand; see `TINT` to dial globally. */
  mask: string;
}

/**
 * Keyed by the Core `tour_topic` enum. Six brand hues cover the eight topics, so two pairs share a
 * family — the label + icon-free pill still tell them apart; re-map here if you want all-distinct.
 */
export const TOPIC_STYLE: Record<string, TopicStyle> = {
  GENERAL_CAMPUS: {
    label: "Campus life",
    tagColor: "coral",
    icon: Sparkles,
    dot: "bg-coral",
    solid: "bg-coral-foreground",
    text: "text-coral-foreground",
    tag: "bg-coral-soft text-coral-foreground",
    mask: "from-coral/55 to-coral-foreground/20",
  },
  DORM_HOUSING: {
    label: "Dorms & housing",
    tagColor: "blue",
    icon: BedDouble,
    dot: "bg-primary",
    solid: "bg-primary-dark",
    text: "text-primary-dark",
    tag: "bg-primary-soft text-primary-dark",
    mask: "from-primary/55 to-primary-dark/25",
  },
  DINING_STUDENT_LIFE: {
    label: "Dining & student life",
    tagColor: "spark",
    icon: UtensilsCrossed,
    dot: "bg-amber",
    solid: "bg-warning-foreground",
    text: "text-warning-foreground",
    tag: "bg-warning-soft text-warning-foreground",
    mask: "from-amber/55 to-warning-foreground/20",
  },
  INTERNATIONAL_STUDENT: {
    label: "International",
    tagColor: "sage",
    icon: Globe,
    dot: "bg-sage-deep",
    solid: "bg-sage-foreground",
    text: "text-sage-foreground",
    tag: "bg-sage-soft text-sage-foreground",
    mask: "from-sage/60 to-sage-foreground/20",
  },
  MAJOR_SPECIFIC: {
    label: "Academics & majors",
    tagColor: "purple",
    icon: GraduationCap,
    dot: "bg-purple",
    solid: "bg-purple-foreground",
    text: "text-purple-foreground",
    tag: "bg-purple-soft text-purple-foreground",
    mask: "from-purple/50 to-purple-foreground/20",
  },
  PARENT_FOCUSED: {
    label: "For parents",
    tagColor: "purple",
    icon: Users,
    dot: "bg-purple",
    solid: "bg-purple-foreground",
    text: "text-purple-foreground",
    tag: "bg-purple-soft text-purple-foreground",
    mask: "from-purple/45 to-purple-foreground/15",
  },
  FRESHMAN: {
    label: "First-year",
    tagColor: "green",
    icon: Sprout,
    dot: "bg-success",
    solid: "bg-success-foreground",
    text: "text-success-foreground",
    tag: "bg-success-soft text-success-foreground",
    mask: "from-success/55 to-success-foreground/20",
  },
  TRANSFER: {
    label: "Transfer",
    tagColor: "blue",
    icon: ArrowRightLeft,
    dot: "bg-primary",
    solid: "bg-primary-dark",
    text: "text-primary-dark",
    tag: "bg-primary-soft text-primary-dark",
    mask: "from-primary/45 to-primary-dark/15",
  },
};

const TOPIC_FALLBACK: TopicStyle = {
  label: "Tour",
  tagColor: "gray",
  icon: MapPin,
  dot: "bg-ink-soft",
  solid: "bg-ink-soft",
  text: "text-ink-soft",
  tag: "bg-muted text-ink-soft",
  mask: "from-ink/35 to-ink/10",
};

export function topicStyle(topic: string | null | undefined): TopicStyle {
  return (topic && TOPIC_STYLE[topic]) || TOPIC_FALLBACK;
}

/** Global mask-strength dial. `opacity-*` on the mask layer; lower = photo shows more. */
export const TINT = {
  subtle: "opacity-60",
  normal: "opacity-80",
  vivid: "opacity-100",
} as const;
export type TintStrength = keyof typeof TINT;

/* ------------------------------------------------------------------ campus → photo / gradient */

export interface CampusVisual {
  /** Registered photo, or null → use the gradient fallback. */
  imageSrc: string | null;
  /** Deterministic brand gradient used when no photo is registered (keeps schools distinct). */
  gradient: string;
  /** 2-letter monogram for the crest badge. */
  crest: string;
  /** Crest text colour (a stable brand tone per campus). */
  crestColor: string;
}

/**
 * Per-university photo OVERRIDES, keyed by `universityName`. By default {@link campusVisual} derives
 * the path straight from the name — `public/assets/<universityName>.png` — because the campus images
 * are stored under exactly that name (e.g. `public/assets/Stanford University.png`). Add a row here
 * only when a file's name differs from the display name. (universityId is a per-environment UUID, so
 * it is intentionally not used as a key for now.) A name with no matching file degrades to
 * {@link CAMPUS_FALLBACK_IMAGE} via the card's `<Image onError>`.
 */
export const CAMPUS_IMAGES: Record<string, string> = {
  // The catalog stores College Scorecard names (e.g. "University of California-Berkeley"), but the
  // campus photos were saved under the schools' cleaner display names — so the default
  // `/assets/<name>.png` derivation 404s (→ next/image 400). Map each Scorecard name to its file.
  "University of California-Berkeley": "/assets/University of California, Berkeley.png",
  "University of California-Davis": "/assets/University of California, Davis.png",
  "University of California-Irvine": "/assets/University of California, Irvine.png",
  "University of California-San Diego": "/assets/University of California, San Diego.png",
  "University of California-Santa Barbara": "/assets/University of California, Santa Barbara.png",
  "University of Michigan-Ann Arbor": "/assets/University of Michigan.png",
  "University of Washington-Seattle Campus": "/assets/University of Washington.png",
  "University of Minnesota-Twin Cities": "/assets/University of Minnesota.png",
  "University of Maryland-College Park": "/assets/University of Maryland, College Park.png",
  "University of Pittsburgh-Pittsburgh Campus": "/assets/University of Pittsburgh.png",
  "University of Virginia-Main Campus": "/assets/University of Virginia.png",
  "Georgia Institute of Technology-Main Campus": "/assets/Georgia Institute of Technology.png",
  "Ohio State University-Main Campus": "/assets/Ohio State University.png",
  "Pennsylvania State University-Main Campus": "/assets/Pennsylvania State University.png",
  "Purdue University-Main Campus": "/assets/Purdue University.png",
  "Rutgers University-New Brunswick": "/assets/Rutgers University.png",
  "Texas A&M University-College Station": "/assets/Texas A&M University.png",
  "The University of Texas at Austin": "/assets/University of Texas at Austin.png",
  "Indiana University-Bloomington": "/assets/Indiana University Bloomington.png",
  "Arizona State University Campus Immersion": "/assets/Arizona State University.png",
  "Columbia University in the City of New York": "/assets/Columbia University.png",
  // Seeded schools with no campus photo yet — point at the shared fallback so we don't request a
  // missing file (404 → 400). Replace with a real photo when one is added.
  "Northwestern University": "/assets/hero-campus.png",
  "Tulane University of Louisiana": "/assets/hero-campus.png",
  "University of Iowa": "/assets/hero-campus.png",
};

/** Campus photos live directly under `public/assets`, named by the university's display name. */
function campusImagePath(universityName: string): string {
  return CAMPUS_IMAGES[universityName] ?? `/assets/${universityName}.png`;
}

/**
 * Fallback campus photo, used when a university has no entry in {@link CAMPUS_IMAGES}. Must be a
 * path under `public/` (served from the site root), e.g. `/hero-campus.png` for `public/hero-campus.png`. Set to
 * `null` to fall back to the deterministic per-university gradient instead of a shared photo.
 */
export const CAMPUS_FALLBACK_IMAGE: string | null = "/assets/hero-campus.png";

/** Optional curated crest overrides, keyed by universityId. Falls back to computed initials. */
export const CAMPUS_CREST: Record<string, string> = {};

const GRADIENTS = [
  "bg-gradient-to-br from-[#E7EEF3] to-[#D9E6DE]",
  "bg-gradient-to-br from-[#EAF0E7] to-[#F3ECDD]",
  "bg-gradient-to-br from-[#E9E5F6] to-[#E3ECEF]",
  "bg-gradient-to-br from-[#F3E7E3] to-[#EFE7DC]",
  "bg-gradient-to-br from-[#F8EEDD] to-[#F3E7E3]",
];
const CREST_COLORS = [
  "text-primary-dark",
  "text-sage-foreground",
  "text-coral-foreground",
  "text-purple-foreground",
  "text-warning-foreground",
];

/** Stable non-negative hash so a given university always maps to the same gradient/colour. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Initials from the first two significant words: "North Coast University" → "NC". */
export function campusInitials(name: string): string {
  const words = name
    .replace(/[^A-Za-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return (letters.join("") || name.slice(0, 2).toUpperCase()).slice(0, 3);
}

export function campusVisual(universityId: string, universityName: string): CampusVisual {
  const key = hash(universityId || universityName);
  return {
    imageSrc: campusImagePath(universityName),
    gradient: GRADIENTS[key % GRADIENTS.length],
    crest: CAMPUS_CREST[universityId] ?? campusInitials(universityName),
    crestColor: CREST_COLORS[key % CREST_COLORS.length],
  };
}

/* ------------------------------------------------------------------ major → icon */

export interface MajorGlyph {
  label: string;
  icon: LucideIcon;
}

// Majors are open-ended, real program names (from the live directory), so match by keyword rather
// than an exact table — the icon is a frontend concern (a component the backend can't serialise).
// First matching pattern wins; `BookOpen` is the default.
// Ordered CIP-family coverage: the guide's major is a real program name from the live directory, so
// match by keyword across the U.S. Dept. of Education CIP series. FIRST match wins, so more specific
// fields come before broader ones (e.g. "biomedical engineering" hits Engineering before Biology).
const MAJOR_ICON_KEYWORDS: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  // Computing & information (CIP 11)
  [
    /comput|informat|data scien|software|cyber|network|web (?:dev|design)|information system/,
    Code2,
  ],
  // Electrical / electronics (part of 14/15)
  [/electr|electronic/, Zap],
  // Mechanical / mechatronics
  [/mechanic|mechatron/, Cog],
  // Civil / construction / surveying (14/46)
  [/civil eng|construct|surveying|structural eng/, HardHat],
  // Architecture / urban planning (04)
  [/architect|urban (?:plan|stud)|landscape arch/, Building2],
  // Aerospace / aviation / transportation / automotive / marine (14/47/49)
  [/aerospace|aeronaut|aviat|\bpilot|transportation|automotive|\bmarine\b|naval/, Plane],
  // Chemistry (40)
  [/chem(?:istry|ical)/, FlaskConical],
  // Physics / astronomy (40)
  [/physic|astronom|astrophys/, Atom],
  // Mathematics / statistics (27)
  [/mathemat|statistic|actuar|quantitative/, Sigma],
  // Accounting / finance (52)
  [/account|\bfinanc/, Calculator],
  // Economics (45)
  [/econ/, TrendingUp],
  // Business / management / marketing / hospitality (52)
  [
    /business|management|marketing|entrepreneur|commerce|logistic|supply chain|real estate|hospitality|hotel|tourism/,
    Briefcase,
  ],
  // Engineering (general — after the specific engineering fields above) (14/15)
  [/engineer/, Wrench],
  // Health / medicine / nursing / allied health / veterinary (51/60)
  [
    /health|medic|nurs|pharma|dental|dentist|\btherap|clinical|anatomy|physiolog|epidemi|veterinar|radiolog|optomet|kinesiolog|athletic train|occupational|speech.language|audiolog|midwif/,
    Stethoscope,
  ],
  // Psychology / cognitive / neuroscience (42)
  [/psycholog|neuro|cognitive|behavioral scien/, Brain],
  // Biological & biomedical sciences (26)
  [/biolog|life scien|biomed|genetic|zoolog|botan|microbio|biochem|molecular|neuroscienc/, Dna],
  // Environment / earth / natural resources (03/40)
  [
    /environment|natural resourc|forest|conservation|sustainab|wildlife|fisher|ecolog|\bsoil|climate|earth scien|geolog|ocean|atmospher|meteorolog|hydrolog/,
    Leaf,
  ],
  // Agriculture / animal science (01)
  [
    /agricultur|agronom|animal scien|\bcrop|\bfarm|horticultur|dairy|poultry|veterinary tech/,
    Sprout,
  ],
  // Law / legal (22)
  [/\blaw\b|legal|jurisprud|paralegal|juris doctor/, Scale],
  // Criminal justice / security / military / fire (43/28/29)
  [
    /criminal justice|homeland security|law enforc|forensic|\bfire (?:scien|protec|service)|military|\bdefense\b|security stud|corrections|policing/,
    Shield,
  ],
  // Political science / international / public administration / government (44/45)
  [
    /politic|international relation|international stud|public (?:admin|policy|affair)|government|diplomacy|public service/,
    Landmark,
  ],
  // History / archaeology / classics (54)
  [/histor|archaeolog|\bclassic|ancient (?:studies|histor)/, Landmark],
  // Geography / GIS (45)
  [/geograph|geospatial|cartograph|\bgis\b/, MapPin],
  // Foreign languages / linguistics / translation (16)
  [
    /language|linguist|\bspanish|\bfrench|\bgerman|\bchinese|\bjapanese|\bkorean|\blatin\b|\barabic|\bitalian|translat|interpret/,
    Languages,
  ],
  // Journalism / communication / media / PR (09/10)
  [/journalis|communicat|media stud|mass media|public relation|broadcast|advertis/, Megaphone],
  // Sociology / anthropology / social work / area & cultural / gender (45/05/19/44)
  [
    /sociolog|anthropolog|social work|human servic|social scien|\bgender|ethnic|cultural stud|geront|family (?:scien|stud|and consumer)|women'?s stud/,
    Users,
  ],
  // Education / teaching (13)
  [/education|teach|pedagog|curriculum|early childhood|instruction/, GraduationCap],
  // Music (50)
  [/music|\bband\b|orchestr|\bjazz|vocal performance/, Music],
  // Film / photography / animation / digital media (50/10)
  [/film|cinema|\bvideo|photograph|animation|digital media|game (?:design|art)/, Film],
  // Theatre / dance / performing arts (50)
  [/theat|drama|\bdance\b|performing art|acting/, Drama],
  // Visual / studio / fine arts / design (50)
  [
    /design|\bart\b|fine art|studio art|painting|sculptur|visual art|graphic|illustrat|ceramic|fashion|interior design|\bcraft/,
    Palette,
  ],
  // Culinary / food science / nutrition (12/19)
  [/culinar|food scien|nutrition|dietet|gastronom/, UtensilsCrossed],
  // Philosophy / religion / theology (38/39)
  [/philosoph|religio|theolog|divinity|\bethic|ministr|biblical|spiritual/, Church],
  // Recreation / fitness / sport (31)
  [/recreation|exercise scien|sport(?:s)? (?:manag|scien)|fitness|physical educ|leisure/, Dumbbell],
  // English / literature / writing / humanities / liberal arts (23/24)
  [
    /english|literatur|writing|rhetoric|creative writ|humanit|liberal (?:art|stud)|comparative lit|\bpoetry/,
    BookOpen,
  ],
];

export function majorGlyph(major: string): MajorGlyph {
  const label = major.trim();
  const hit = MAJOR_ICON_KEYWORDS.find(([re]) => re.test(label.toLowerCase()));
  return { label, icon: hit ? hit[1] : BookOpen };
}

/* ------------------------------------------------------------------ tour feature chips */

/**
 * Fallback label for a feature code, used only until the backend catalog (GET /v1/meta/tour-features
 * via `useTourFeatures`) has loaded — the backend is the single source of truth for feature labels,
 * so we never hardcode the vocabulary here. Title-cases the enum name, e.g. "Q_AND_A" → "Q And A".
 */
export function prettifyFeatureCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------------ language chips */
// A language's English name is a presentation concern, derived on the client from the canonical
// BCP-47 tag the backend stores — no parallel "names" field needed. Intl covers every tag
// ("zh" → "Chinese", "es" → "Spanish"); build it once and fall back to the code if unavailable.
let languageDisplay: Intl.DisplayNames | null = null;
try {
  languageDisplay = new Intl.DisplayNames(["en"], { type: "language" });
} catch {
  languageDisplay = null;
}

/** English name for a BCP-47 language tag (e.g. "en-US" → "English", "zh" → "Chinese"). */
export function languageLabel(tag: string): string {
  const primary = tag.trim().split("-")[0].toLowerCase();
  if (!primary) return tag.trim();
  try {
    return languageDisplay?.of(primary) ?? primary.toUpperCase();
  } catch {
    return primary.toUpperCase();
  }
}
