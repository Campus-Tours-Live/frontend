import { fireEvent, render, screen } from "@testing-library/react";
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

  it("links the university name to the university profile page", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /stanford university/i });
    expect(link).toHaveAttribute("href", "/university");
  });

  it("stops the university link click from reaching a wrapping click handler", () => {
    // The link sits inside a would-be-clickable card, so its own onClick calls
    // stopPropagation() — verified by wrapping it in a React onClick (rather than a
    // raw DOM listener, which fires during native bubbling before React ever
    // dispatches this component's synthetic handler and so can't observe the effect).
    const onWrapperClick = jest.fn();
    render(
      <div onClick={onWrapperClick}>
        <TourCard {...base} />
      </div>,
    );

    fireEvent.click(screen.getByRole("link", { name: /stanford university/i }));

    expect(onWrapperClick).not.toHaveBeenCalled();
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
