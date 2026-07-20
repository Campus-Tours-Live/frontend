import { render, screen } from "@testing-library/react";
import { Divider } from "@/components/ui/divider/Divider";

describe("Divider", () => {
  it("is decorative by default — hidden from screen readers, no separator role", () => {
    const { container } = render(<Divider />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    const rule = container.querySelector("div");
    expect(rule).toHaveAttribute("aria-hidden", "true");
    expect(rule).toHaveClass("border-t");
  });

  it("becomes a labelled separator when given a title", () => {
    render(<Divider title="Billing" />);
    const sep = screen.getByRole("separator", { name: "Billing" });
    expect(sep).not.toHaveAttribute("aria-hidden");
    expect(sep).toHaveClass("border-t");
  });

  it("supports vertical orientation and inset", () => {
    render(<Divider orientation="vertical" inset title="V" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep).toHaveClass("border-l");
  });

  it("insets a decorative horizontal rule from the edges", () => {
    const { container } = render(<Divider inset />);
    expect(container.querySelector("div")).toHaveClass("mx-5");
  });
});
