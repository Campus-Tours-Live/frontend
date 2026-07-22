import { render } from "@testing-library/react";
import { RatingStar } from "@/components/ui/rating/RatingStar";

describe("RatingStar", () => {
  it("defaults to a small, empty star when size/variant are omitted", () => {
    const { container } = render(<RatingStar />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
    expect(svg).toHaveClass("fill-border");
  });

  it("renders a large filled star when explicit props are given", () => {
    const { container } = render(<RatingStar size="large" variant="filled" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveClass("fill-warning");
  });

  it("renders a half-filled star with a gradient fill", () => {
    const { container } = render(<RatingStar variant="halfFilled" />);
    expect(container.querySelector("linearGradient")).toBeInTheDocument();
    expect(container.querySelector("path[fill^='url(#']")).toBeInTheDocument();
  });
});
