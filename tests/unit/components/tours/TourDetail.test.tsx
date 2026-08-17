import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { TourDetail } from "@/components/tours/TourDetail";
import type { TourDetail as TourDetailData } from "@/lib/data-access";
import { CAMPUS_FALLBACK_IMAGE } from "@/components/tours/tourCard.visuals";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img src={String(src)} alt={alt ?? ""} {...props} />,
}));

const tour: TourDetailData = {
  id: "a0000000-0000-4000-8000-000000000001",
  title: "North Campus highlights",
  slug: "north-campus-highlights",
  topic: "GENERAL_CAMPUS",
  description: "A guided walk through the north campus.",
  languages: ["en-US", "zh-CN"],
  universityId: "university-id",
  universityName: "North Coast University",
  universityImageUrl: null,
  universitySlug: "north-coast",
  universityCity: "Arcata",
  universityRegion: "CA",
  guideId: "guide-id",
  guideDisplayName: "Maya Chen",
  guideBio: "Third-year student and campus tour lead.",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.5,
  reviewCount: 12,
};

describe("TourDetail", () => {
  it("renders fields supplied by the backend contract", () => {
    const imageUrl =
      "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/North%20Coast%20University.png";

    render(<TourDetail tour={{ ...tour, universityImageUrl: imageUrl }} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(tour.title);
    expect(screen.getByRole("img", { name: /north coast university campus/i })).toHaveAttribute(
      "src",
      imageUrl,
    );
    expect(screen.getByText("Arcata, CA")).toBeInTheDocument();
    expect(screen.getByText("$42.00")).toBeInTheDocument();
    expect(screen.getByText("en-US · zh-CN")).toBeInTheDocument();
    expect(screen.getByText("4.5 from 12 reviews")).toBeInTheDocument();
  });

  it("does not invent optional API fields", () => {
    render(
      <TourDetail
        tour={{
          ...tour,
          description: null,
          languages: [],
          universityCity: null,
          universityRegion: null,
          guideBio: null,
          reviewCount: 0,
        }}
      />,
    );

    expect(
      screen.getByText(/ask the guide about this live campus experience/i),
    ).toBeInTheDocument();
    expect(screen.getByText("New tour")).toBeInTheDocument();
  });

  it("falls back to the shared campus image when the backend image fails", () => {
    const imageUrl = "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/Broken%20Campus.png";

    render(<TourDetail tour={{ ...tour, universityImageUrl: imageUrl }} />);

    const heroImage = screen.getByRole("img", { name: /north coast university campus/i });
    fireEvent.error(heroImage);

    expect(heroImage).toHaveAttribute("src", CAMPUS_FALLBACK_IMAGE);
  });
});
