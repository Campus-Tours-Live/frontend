import { render, screen } from "@testing-library/react";
import { Rating } from "@/components/ui/Rating";

describe("Rating", () => {
  it("renders 5 stars and exposes the value as its accessible name", () => {
    const { container } = render(<Rating value={3.5} />);
    expect(screen.getByRole("img", { name: "3.5 out of 5 stars" })).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  it("fills stars by value (3.5 → 3 filled, 1 half, 1 empty)", () => {
    const { container } = render(<Rating value={3.5} />);
    expect(container.querySelectorAll("svg.fill-warning")).toHaveLength(3);
    expect(container.querySelectorAll("svg.fill-border")).toHaveLength(1);
    // The half star uses a gradient fill — neither the filled nor empty class.
    const gradients = container.querySelectorAll("linearGradient");
    expect(gradients).toHaveLength(1);
  });

  it("rounds to filled/empty at the .25/.75 thresholds", () => {
    const { container } = render(<Rating value={4} />);
    expect(container.querySelectorAll("svg.fill-warning")).toHaveLength(4);
    expect(container.querySelectorAll("svg.fill-border")).toHaveLength(1);
  });
});
