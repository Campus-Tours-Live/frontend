import { render, screen } from "@testing-library/react";
import { Divider } from "@/components/ui/Divider";

describe("Divider", () => {
  it("renders a horizontal separator by default", () => {
    render(<Divider />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    expect(sep).toHaveClass("border-t");
  });

  it("renders a vertical separator", () => {
    render(<Divider orientation="vertical" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep).toHaveClass("border-l");
  });

  it("insets from the edges when `inset`", () => {
    render(<Divider inset />);
    expect(screen.getByRole("separator")).toHaveClass("mx-5");
  });
});
