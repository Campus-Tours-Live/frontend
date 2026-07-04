export interface TourDetail {
  id: string;
  title: string;
  university: string;
  campusLocation: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  timeZone: string;
  durationMinutes: number;
  language: string;
  price: number;
  spotsLeft: number;
  topics: string[];
  stops: string[];
  guide: {
    name: string;
    initials: string;
    major: string;
    year: string;
    bio: string;
    verified: boolean;
  };
}

const PRIMARY_TOURS: TourDetail[] = [
  {
    id: "north-coast-campus-life",
    title: "Campus life and hidden study spots",
    university: "North Coast University",
    campusLocation: "Eureka, California",
    description:
      "Walk the campus with Maya and see the places students actually use every day—from the busiest quad to quiet corners that never make it into the official brochure.",
    dateLabel: "Saturday, July 18",
    timeLabel: "10:00 AM",
    timeZone: "Pacific Time",
    durationMinutes: 60,
    language: "English · Mandarin",
    price: 42,
    spotsLeft: 4,
    topics: ["Campus life", "Study spaces", "Dining", "Student clubs"],
    stops: [
      "Main quad and student center",
      "Library floors and hidden study corners",
      "Dining hall and favorite nearby cafés",
      "First-year residence halls",
    ],
    guide: {
      name: "Maya Chen",
      initials: "MC",
      major: "Computer Science",
      year: "Third-year student",
      bio: "Maya is an international student and peer mentor who loves helping new students understand what everyday campus life really feels like.",
      verified: true,
    },
  },
];

const RELATED_TOURS = [
  {
    id: "redwood-engineering",
    title: "Engineering, labs, and student projects",
    university: "Redwood State College",
    guide: "Elias Brooks",
    initials: "EB",
    durationMinutes: 45,
    price: 36,
  },
  {
    id: "harborview-international",
    title: "International student experience",
    university: "Harborview University",
    guide: "Sofia Patel",
    initials: "SP",
    durationMinutes: 60,
    price: 44,
  },
  {
    id: "north-coast-housing",
    title: "Dorm tour and housing options",
    university: "North Coast University",
    guide: "Liam Walsh",
    initials: "LW",
    durationMinutes: 30,
    price: 28,
  },
  {
    id: "lakeside-arts",
    title: "Arts, studios, and performance spaces",
    university: "Lakeside College",
    guide: "Aria Nguyen",
    initials: "AN",
    durationMinutes: 45,
    price: 38,
  },
  {
    id: "summit-sports",
    title: "Sports, gyms, and student rec",
    university: "Summit University",
    guide: "Marcus Lee",
    initials: "ML",
    durationMinutes: 30,
    price: 30,
  },
  {
    id: "harborview-libraries",
    title: "Libraries and quiet study corners",
    university: "Harborview University",
    guide: "Chloe Adams",
    initials: "CA",
    durationMinutes: 45,
    price: 34,
  },
  {
    id: "redwood-dining",
    title: "Dining halls and campus food scene",
    university: "Redwood State College",
    guide: "Diego Romero",
    initials: "DR",
    durationMinutes: 30,
    price: 26,
  },
  {
    id: "summit-research",
    title: "Research labs and grad pathways",
    university: "Summit University",
    guide: "Priya Shah",
    initials: "PS",
    durationMinutes: 60,
    price: 48,
  },
] as const;

export const TOURS: TourDetail[] = [
  ...PRIMARY_TOURS,
  ...RELATED_TOURS.map((summary) => ({
    ...PRIMARY_TOURS[0],
    id: summary.id,
    title: summary.title,
    university: summary.university,
    durationMinutes: summary.durationMinutes,
    price: summary.price,
    description: `Join ${summary.guide} for a live, student-led look at ${summary.title.toLowerCase()} and ask the questions that matter to you.`,
    guide: {
      ...PRIMARY_TOURS[0].guide,
      name: summary.guide,
      initials: summary.initials,
    },
  })),
];

export function getTourById(id: string): TourDetail | undefined {
  return TOURS.find((tour) => tour.id === id);
}
