import { render, screen } from "@testing-library/react";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { TourCard } from "@/components/tours/TourCard";

describe("FeaturedTours", () => {
  it("renders the section heading", () => {
    render(<FeaturedTours />);
    expect(
      screen.getByRole("heading", { level: 2, name: /start with a campus that feels right/i }),
    ).toBeInTheDocument();
  });

  it("renders all nine featured tour cards in the carousel", () => {
    render(<FeaturedTours />);
    expect(screen.getByText(/campus life and hidden study spots/i)).toBeInTheDocument();
    expect(screen.getByText(/research labs and grad pathways/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^view (?!all tours)/i })).toHaveLength(9);
  });

  it("renders carousel navigation arrows", () => {
    render(<FeaturedTours />);
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next tours/i })).toBeInTheDocument();
  });
});

describe("TourCard", () => {
  it("renders price, guide meta and a verified badge", () => {
    render(
      <TourCard
        id="test-tour"
        title="Test tour"
        university="Test University"
        guide="Jane Doe"
        durationMinutes={30}
        price={25}
      />,
    );
    expect(screen.getByRole("heading", { level: 4, name: /test tour/i })).toBeInTheDocument();
    expect(screen.getByText(/Test University · Jane Doe · 30 min/i)).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText(/verified guide/i)).toBeInTheDocument();
  });
});
