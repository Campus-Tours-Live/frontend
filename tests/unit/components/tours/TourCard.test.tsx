import { render, screen } from "@testing-library/react";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";

const base: TourCardProps = {
  title: "Sunrise Walk Through Old Campus",
  university: "Stanford University",
  guide: "Ada L.",
  durationMinutes: 45,
  price: "$29.00",
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

  it("renders university and guide meta plus duration badge", () => {
    renderCard();

    // University and guide render as separate elements (university truncates on
    // overflow; the guide name — the key trust signal — always stays fully visible).
    expect(screen.getByText("Stanford University")).toBeInTheDocument();
    expect(screen.getByText("· Ada L.")).toBeInTheDocument();
    expect(screen.getByText(/45\s*min/i)).toBeInTheDocument();
  });

  it("renders the pre-formatted price as-is", () => {
    renderCard({ price: "$120.00" });

    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("renders a free tour as $0.00", () => {
    renderCard({ price: "$0.00" });

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("renders the verified-guide badge and the inert View tour button", () => {
    renderCard();

    expect(screen.getByText("Verified guide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View tour" })).toBeInTheDocument();
  });

  it("reflects different prop values (prop variation)", () => {
    renderCard({
      title: "Night Tour of the Quad",
      university: "MIT",
      guide: "Grace H.",
      durationMinutes: 90,
      price: "$55.00",
    });

    expect(screen.getByRole("heading", { name: "Night Tour of the Quad" })).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("· Grace H.")).toBeInTheDocument();
    expect(screen.getByText(/90\s*min/i)).toBeInTheDocument();
    expect(screen.getByText("$55.00")).toBeInTheDocument();
  });
});
