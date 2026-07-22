import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("swaps to the shared fallback image after the campus photo fails to load", () => {
    const imageUrl = "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/Broken.png";
    render(<TourProductCard tour={{ ...tour, universityImageUrl: imageUrl }} />);
    const [frontImage] = screen.getAllByAltText(/campus/i);

    fireEvent.error(frontImage);

    const images = screen.getAllByAltText(/campus/i);
    for (const img of images) {
      const src = img.getAttribute("src") ?? "";
      const url = new URL(src, "http://localhost").searchParams.get("url") ?? src;
      expect(url).toBe(
        "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/University%20Campus.png",
      );
    }
  });

  /**
   * Campus imagery is arbitrary — pale hand-drawn illustrations as much as dark photos — so the
   * save control cannot assume a dark ground. Ivory glass on a cream sky left the heart at roughly
   * 1:1 contrast, i.e. absent for anyone not tabbing to it. Pin the smoke tone so a refactor
   * cannot silently fall back to the variant's default.
   */
  it("gives the save control the smoke tone so it survives pale campus art", () => {
    render(<TourProductCard tour={tour} onToggleSave={jest.fn()} />);
    const save = screen.getByRole("button", { name: "Save tour" });
    expect(save).toHaveClass("glass", "glass-smoke");
    expect(save).not.toHaveClass("glass-light");
  });

  it("calls onToggleSave with the tour id when the save control is clicked, and reflects saved state", async () => {
    const user = userEvent.setup();
    const onToggleSave = jest.fn();
    render(<TourProductCard tour={tour} saved onToggleSave={onToggleSave} />);
    const save = screen.getByRole("button", { name: "Remove from saved" });
    expect(save).toHaveAttribute("aria-pressed", "true");
    await user.click(save);
    expect(onToggleSave).toHaveBeenCalledWith(tour.id);
  });

  it("shows cents in the price when priceCents is not a whole dollar amount", () => {
    render(<TourProductCard tour={{ ...tour, priceCents: 4250 }} />);
    expect(screen.getByText("$42.50")).toBeInTheDocument();
  });

  it("falls back to '?' initials when the guide's display name has no letters", () => {
    render(<TourProductCard tour={{ ...tour, guideDisplayName: "   " }} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("shows a credentials line from entry year alone, with no major icon", () => {
    render(<TourProductCard tour={tour} entryYear={2023} />);
    expect(screen.getByText("Entered 2023")).toBeInTheDocument();
  });

  it("hides the languages and feature-chip rows when the tour has none", () => {
    render(<TourProductCard tour={{ ...tour, languages: [], features: [] }} />);
    expect(screen.queryByText("English")).not.toBeInTheDocument();
    expect(screen.queryByText("Q And A")).not.toBeInTheDocument();
  });

  it("renders a whole-number rating without a decimal", () => {
    render(<TourProductCard tour={{ ...tour, avgRating: 5, reviewCount: 7 }} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("(7)")).toBeInTheDocument();
  });
});
