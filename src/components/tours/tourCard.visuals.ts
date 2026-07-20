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
 *   topic  → COLOUR   (a soft mask from the `--topic-*` scale over the photo + pill + tags)
 *   campus → PHOTO    (a per-university image, with a shared fallback photo when absent)
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
 * Keyed by the Core `tour_topic` enum. Every topic has its own colour family from the `--topic-*`
 * categorical scale — that scale exists precisely because the previous arrangement borrowed six
 * semantic hues for eight topics and two pairs came out identical (see the scale's note in
 * `globals.css`).
 *
 * Re-mapping a topic here is fine; INVENTING a colour for it is not. The guarantee is a property of
 * the set, not of any one entry, and `topic-colour-distance.test.ts` measures it.
 */
export const TOPIC_STYLE: Record<string, TopicStyle> = {
  GENERAL_CAMPUS: {
    label: "Campus life",
    tagColor: "blush",
    icon: Sparkles,
    dot: "bg-blush",
    text: "text-blush-foreground",
    tag: "bg-blush-soft text-blush-foreground",
    mask: "from-blush/50 to-blush-foreground/20",
  },
  DORM_HOUSING: {
    label: "Dorms & housing",
    tagColor: "azure",
    icon: BedDouble,
    dot: "bg-azure",
    text: "text-azure-foreground",
    tag: "bg-azure-soft text-azure-foreground",
    mask: "from-azure/50 to-azure-foreground/20",
  },
  DINING_STUDENT_LIFE: {
    label: "Dining & student life",
    tagColor: "rust",
    icon: UtensilsCrossed,
    dot: "bg-rust",
    text: "text-rust-foreground",
    tag: "bg-rust-soft text-rust-foreground",
    mask: "from-rust/50 to-rust-foreground/20",
  },
  INTERNATIONAL_STUDENT: {
    label: "International",
    tagColor: "olive",
    icon: Globe,
    dot: "bg-olive",
    text: "text-olive-foreground",
    tag: "bg-olive-soft text-olive-foreground",
    mask: "from-olive/50 to-olive-foreground/20",
  },
  MAJOR_SPECIFIC: {
    label: "Academics & majors",
    tagColor: "iris",
    icon: GraduationCap,
    dot: "bg-iris",
    text: "text-iris-foreground",
    tag: "bg-iris-soft text-iris-foreground",
    mask: "from-iris/50 to-iris-foreground/20",
  },
  PARENT_FOCUSED: {
    label: "For parents",
    tagColor: "mauve",
    icon: Users,
    dot: "bg-mauve",
    text: "text-mauve-foreground",
    tag: "bg-mauve-soft text-mauve-foreground",
    mask: "from-mauve/50 to-mauve-foreground/20",
  },
  FRESHMAN: {
    label: "First-year",
    tagColor: "moss",
    icon: Sprout,
    dot: "bg-moss",
    text: "text-moss-foreground",
    tag: "bg-moss-soft text-moss-foreground",
    mask: "from-moss/50 to-moss-foreground/20",
  },
  TRANSFER: {
    label: "Transfer",
    tagColor: "lagoon",
    icon: ArrowRightLeft,
    dot: "bg-lagoon",
    text: "text-lagoon-foreground",
    tag: "bg-lagoon-soft text-lagoon-foreground",
    mask: "from-lagoon/50 to-lagoon-foreground/20",
  },
};

const TOPIC_FALLBACK: TopicStyle = {
  label: "Tour",
  tagColor: "gray",
  icon: MapPin,
  dot: "bg-ink-soft",
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

/* ------------------------------------------------------------------ campus → photo / crest */

export interface CampusVisual {
  /**
   * 2-letter monogram for the crest badge.
   *
   * NOTE — crest/crestColor currently have NO production consumer: the shipped card design
   * (TourProductCard) is photo-only. They are kept as the crest chrome this module is meant to
   * supply, not as leftovers. Distinct from the former `gradient` field, which was removed
   * because its purpose — "shown when no photo is registered" — no longer exists:
   * CAMPUS_FALLBACK_IMAGE backs both the missing-URL and failed-load cases, so it had become
   * unreachable rather than merely unused.
   */
  crest: string;
  /** Crest text colour (a stable brand tone per campus). */
  crestColor: string;
}

/**
 * Shared fallback campus photo (Cloudflare R2), used when a tour has no `universityImageUrl`
 * (backend-provided) or the resolved photo fails to load. The card owns loading the actual photo
 * from `tour.universityImageUrl` — this module only supplies the crest chrome plus this
 * one shared fallback URL.
 */
export const CAMPUS_FALLBACK_IMAGE =
  "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/University%20Campus.png";

/** Optional curated crest overrides, keyed by universityId. Falls back to computed initials. */
export const CAMPUS_CREST: Record<string, string> = {};

const CREST_COLORS = [
  "text-primary-dark",
  "text-sage-foreground",
  "text-coral-foreground",
  "text-purple-foreground",
  "text-warning-foreground",
];

/** Stable non-negative hash so a given university always maps to the same crest colour. */
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
  /* istanbul ignore next -- defensive: words is .filter(Boolean)'d above, so every w is non-empty */
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return (letters.join("") || name.slice(0, 2).toUpperCase()).slice(0, 3);
}

export function campusVisual(universityId: string, universityName: string): CampusVisual {
  const key = hash(universityId || universityName);
  return {
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
