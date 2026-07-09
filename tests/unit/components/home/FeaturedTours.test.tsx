import { render, screen } from "@testing-library/react";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { TourCard } from "@/components/tours/TourCard";
import { useTours } from "@/lib/data-access";
import type { TourSummary } from "@/lib/data-access";

// FeaturedTours reads live data via useTours(); mock the hook so we can drive
// each branch (loading / error / empty / success) without a real QueryClient.
jest.mock("@/lib/data-access", () => ({
  useTours: jest.fn(),
}));

const mockUseTours = useTours as jest.Mock;

const TOURS: TourSummary[] = [
  {
    id: "t1",
    title: "Campus life and hidden study spots",
    slug: "s1",
    topic: "GENERAL_CAMPUS",
    universityId: "u1",
    universityName: "North Coast University",
    guideId: "g1",
    guideDisplayName: "Maya Chen",
    durationMin: 60,
    priceCents: 4200,
    currency: "USD",
    avgRating: 4.5,
    reviewCount: 12,
  },
  {
    id: "t2",
    title: "Engineering, labs, and student projects",
    slug: "s2",
    topic: "ACADEMICS",
    universityId: "u2",
    universityName: "Redwood State College",
    guideId: "g2",
    guideDisplayName: "Elias Brooks",
    durationMin: 45,
    priceCents: 3600,
    currency: "USD",
    avgRating: 4.2,
    reviewCount: 8,
  },
  {
    id: "t3",
    title: "International student experience",
    slug: "s3",
    topic: "STUDENT_LIFE",
    universityId: "u3",
    universityName: "Harborview University",
    guideId: "g3",
    guideDisplayName: "Sofia Patel",
    durationMin: 60,
    priceCents: 4400,
    currency: "USD",
    avgRating: 4.8,
    reviewCount: 20,
  },
  {
    id: "t4",
    title: "Dorm tour and housing options",
    slug: "s4",
    topic: "HOUSING",
    universityId: "u1",
    universityName: "North Coast University",
    guideId: "g4",
    guideDisplayName: "Liam Walsh",
    durationMin: 30,
    priceCents: 2800,
    currency: "USD",
    avgRating: 4.1,
    reviewCount: 5,
  },
  {
    id: "t5",
    title: "Arts, studios, and performance spaces",
    slug: "s5",
    topic: "ARTS",
    universityId: "u4",
    universityName: "Lakeside College",
    guideId: "g5",
    guideDisplayName: "Aria Nguyen",
    durationMin: 45,
    priceCents: 3800,
    currency: "USD",
    avgRating: 4.6,
    reviewCount: 9,
  },
  {
    id: "t6",
    title: "Sports, gyms, and student rec",
    slug: "s6",
    topic: "ATHLETICS",
    universityId: "u5",
    universityName: "Summit University",
    guideId: "g6",
    guideDisplayName: "Marcus Lee",
    durationMin: 30,
    priceCents: 3000,
    currency: "USD",
    avgRating: 4.0,
    reviewCount: 6,
  },
  {
    id: "t7",
    title: "Libraries and quiet study corners",
    slug: "s7",
    topic: "ACADEMICS",
    universityId: "u3",
    universityName: "Harborview University",
    guideId: "g7",
    guideDisplayName: "Chloe Adams",
    durationMin: 45,
    priceCents: 3400,
    currency: "USD",
    avgRating: 4.3,
    reviewCount: 7,
  },
  {
    id: "t8",
    title: "Dining halls and campus food scene",
    slug: "s8",
    topic: "STUDENT_LIFE",
    universityId: "u2",
    universityName: "Redwood State College",
    guideId: "g8",
    guideDisplayName: "Diego Romero",
    durationMin: 30,
    priceCents: 2600,
    currency: "USD",
    avgRating: 4.4,
    reviewCount: 11,
  },
  {
    id: "t9",
    title: "Research labs and grad pathways",
    slug: "s9",
    topic: "ACADEMICS",
    universityId: "u5",
    universityName: "Summit University",
    guideId: "g9",
    guideDisplayName: "Priya Shah",
    durationMin: 60,
    priceCents: 4800,
    currency: "USD",
    avgRating: 4.9,
    reviewCount: 15,
  },
];

function setHook(overrides: Partial<ReturnType<typeof useTours>>) {
  mockUseTours.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useTours>);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("FeaturedTours", () => {
  it("renders a loading state without an error or cards", () => {
    setHook({ isLoading: true });
    render(<FeaturedTours />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view tour/i })).not.toBeInTheDocument();
  });

  it("renders an error alert when isError is true", () => {
    setHook({ isError: true });
    render(<FeaturedTours />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t load featured tours/i);
  });

  it("renders an empty state when there are no tours", () => {
    setHook({ data: [] });
    render(<FeaturedTours />);
    expect(screen.getByText(/no featured tours yet/i)).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    setHook({ data: TOURS });
    render(<FeaturedTours />);
    expect(
      screen.getByRole("heading", { level: 2, name: /start with a campus that feels right/i }),
    ).toBeInTheDocument();
  });

  it("renders all nine featured tour cards in the carousel", () => {
    setHook({ data: TOURS });
    render(<FeaturedTours />);
    expect(screen.getByText(/campus life and hidden study spots/i)).toBeInTheDocument();
    expect(screen.getByText(/research labs and grad pathways/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /view tour/i })).toHaveLength(9);
  });

  it("renders carousel navigation arrows", () => {
    setHook({ data: TOURS });
    render(<FeaturedTours />);
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next tours/i })).toBeInTheDocument();
  });
});

describe("TourCard", () => {
  it("renders price, guide meta and a verified badge", () => {
    render(
      <TourCard
        title="Test tour"
        university="Test University"
        guide="Jane Doe"
        durationMinutes={30}
        price={25}
      />,
    );
    expect(screen.getByRole("heading", { level: 4, name: /test tour/i })).toBeInTheDocument();
    // University and guide render as separate elements (university truncates on
    // overflow; the guide name — the key trust signal — always stays fully visible).
    expect(screen.getByText("Test University")).toBeInTheDocument();
    expect(screen.getByText("· Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/30\s*min/i)).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText(/verified guide/i)).toBeInTheDocument();
  });
});
