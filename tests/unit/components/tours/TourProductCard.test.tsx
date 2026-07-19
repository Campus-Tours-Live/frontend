import { render, screen } from "@testing-library/react";
import { TourProductCard } from "@/components/tours/TourProductCard";
import type { TourSummary } from "@/lib/data-access";

const tour: TourSummary = {
  id: "tour-1",
  title: "Campus life and hidden study spots",
  slug: "campus-life",
  topic: "GENERAL_CAMPUS",
  universityId: "u1",
  universityName: "North Coast University",
  guideId: "g1",
  guideDisplayName: "Maya Chen",
  guideMajor: "Computer Science",
  guideDegree: "BS",
  guideEntryYear: 2023,
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.8,
  reviewCount: 18,
  languages: ["en-US", "zh"],
  features: ["Q_AND_A"],
  isNew: true,
};

describe("TourProductCard", () => {
  it("renders campus, title, guide name and the topic label exactly once", () => {
    render(<TourProductCard tour={tour} />);
    expect(screen.getByText("North Coast University")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tour.title })).toBeInTheDocument();
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    // Topic is shown once (single chip) — the duplicate photo pill was removed.
    expect(screen.getAllByText("Campus life")).toHaveLength(1);
  });

  it("condenses degree + major + entry year into one credentials line", () => {
    render(<TourProductCard tour={tour} major="Computer Science" degree="BS" entryYear={2023} />);
    expect(screen.getByText("BS Computer Science · Entered 2023")).toBeInTheDocument();
  });

  it("omits the credentials line when no guide academic fields are given", () => {
    render(<TourProductCard tour={tour} />);
    expect(screen.queryByText(/Entered/)).not.toBeInTheDocument();
  });

  it("exposes an accessible save control", () => {
    render(<TourProductCard tour={tour} />);
    expect(screen.getByRole("button", { name: /save tour/i })).toBeInTheDocument();
  });

  it("shows the New badge, every language (as English names), and feature chips", () => {
    render(<TourProductCard tour={tour} featureLabels={{ Q_AND_A: "Q&A included" }} />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument(); // languageLabel("en-US")
    expect(screen.getByText("Chinese")).toBeInTheDocument(); // languageLabel("zh")
    expect(screen.getByText("Q&A included")).toBeInTheDocument(); // from featureLabels map
  });

  it("falls back to a prettified code when the feature catalog is absent", () => {
    render(<TourProductCard tour={tour} />);
    expect(screen.getByText("Q And A")).toBeInTheDocument(); // prettifyFeatureCode("Q_AND_A")
  });

  it("hides the New badge when the tour is not new", () => {
    render(<TourProductCard tour={{ ...tour, isNew: false }} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("renders the backend-provided universityImageUrl as the campus photo", () => {
    const imageUrl =
      "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/Stanford%20University.png";
    render(<TourProductCard tour={{ ...tour, universityImageUrl: imageUrl }} />);
    const images = screen.getAllByAltText(/campus/i);
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      const src = img.getAttribute("src") ?? "";
      // next/image rewrites src to `/_next/image?url=<encoded>`; the `url` param, once decoded
      // once by URLSearchParams, is exactly the original R2 URL (itself already percent-encoded).
      const url = new URL(src, "http://localhost").searchParams.get("url") ?? src;
      expect(url).toBe(imageUrl);
    }
  });

  it("falls back to CAMPUS_FALLBACK_IMAGE when universityImageUrl is null", () => {
    render(<TourProductCard tour={{ ...tour, universityImageUrl: null }} />);
    const images = screen.getAllByAltText(/campus/i);
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      const src = img.getAttribute("src") ?? "";
      const url = new URL(src, "http://localhost").searchParams.get("url") ?? src;
      expect(url).toBe(
        "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/University%20Campus.png",
      );
    }
  });
});
