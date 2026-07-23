import { fireEvent, render, screen } from "@testing-library/react";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";

const base: TourCardProps = {
  title: "Sunrise Walk Through Old Campus",
  university: "Stanford University",
  guide: "Ada L.",
  durationMinutes: 45,
  price: 29,
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
    renderCard({ price: 120 });

    expect(screen.getByText("$120")).toBeInTheDocument();
  });

  it("renders a free tour as $0", () => {
    renderCard({ price: 0 });

    expect(screen.getByText("$0")).toBeInTheDocument();
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
      price: 55,
    });

    expect(screen.getByRole("heading", { name: "Night Tour of the Quad" })).toBeInTheDocument();
    expect(screen.getByText("MIT · Grace H. · 90 min")).toBeInTheDocument();
    expect(screen.getByText("$55")).toBeInTheDocument();
  });
});
