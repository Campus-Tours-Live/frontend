import { render, screen } from "@testing-library/react";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";

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
});
