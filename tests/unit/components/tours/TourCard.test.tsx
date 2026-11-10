import { render, screen } from "@testing-library/react";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";
import { CAMPUS_FALLBACK_IMAGE } from "@/components/tours/tourCard.visuals";

const base: TourCardProps = {
  id: "stanford-campus-life",
  title: "Sunrise Walk Through Old Campus",
  university: "Stanford University",
  guide: "Ada L.",
  durationMinutes: 45,
  priceCents: 2900,
  currency: "USD",
  avgRating: 4.5,
  reviewCount: 12,
};

function renderCard(overrides: Partial<TourCardProps> = {}) {
  return render(<TourCard {...base} {...overrides} />);
}

describe("TourCard", () => {
  it("renders the title as a heading", () => {
    renderCard();

    expect(
      screen.getByRole("heading", {
        name: "Sunrise Walk Through Old Campus",
      }),
    ).toBeInTheDocument();
  });

  it("renders the university · guide · duration meta line", () => {
    renderCard();

    expect(screen.getByText("Stanford University · Ada L. · 45 min")).toBeInTheDocument();
  });

  it("renders the price with a dollar sign", () => {
    renderCard({ priceCents: 12000 });

    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("renders a free tour as $0", () => {
    renderCard({ priceCents: 0 });

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("renders the verified-guide badge and links to the detail page", () => {
    renderCard();

    expect(screen.getByText("Verified guide")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Sunrise Walk Through Old Campus" }),
    ).toHaveAttribute("href", "/tours/stanford-campus-life");
  });

  it("reflects different prop values (prop variation)", () => {
    renderCard({
      title: "Night Tour of the Quad",
      university: "MIT",
      guide: "Grace H.",
      durationMinutes: 90,
      priceCents: 5500,
    });

    expect(screen.getByRole("heading", { name: "Night Tour of the Quad" })).toBeInTheDocument();
    expect(screen.getByText("MIT · Grace H. · 90 min")).toBeInTheDocument();
    expect(screen.getByText("$55.00")).toBeInTheDocument();
  });

  const imgSrc = () =>
    screen.getByRole("img", { name: "Stanford University campus" }).getAttribute("src") ?? "";

  it("shows the campus photo from imageUrl with the university in the alt text", () => {
    renderCard({ imageUrl: "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/Stanford.png" });

    expect(imgSrc()).toContain("Stanford.png");
  });

  it("falls back to the shared campus image when imageUrl is missing or null", () => {
    const { unmount } = renderCard();
    expect(imgSrc()).toContain(encodeURIComponent(CAMPUS_FALLBACK_IMAGE));
    unmount();

    renderCard({ imageUrl: null });
    expect(imgSrc()).toContain(encodeURIComponent(CAMPUS_FALLBACK_IMAGE));
  });

  it("no longer renders the placeholder caption", () => {
    renderCard();

    expect(screen.queryByText("Imported editorial campus crop")).not.toBeInTheDocument();
  });
});
