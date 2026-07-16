import { render, screen } from "@testing-library/react";
import { Caption } from "@/components/ui/typography/Caption";

describe("Caption", () => {
  it("renders a muted span by default at the caption size", () => {
    render(<Caption>Required field</Caption>);
    const el = screen.getByText("Required field");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("text-[12px]", "font-sans", "font-normal", "text-ink-soft");
  });

  it("maps weight + color tokens", () => {
    render(
      <Caption weight={700} color="error">
        Error
      </Caption>,
    );
    const el = screen.getByText("Error");
    expect(el).toHaveClass("font-bold", "text-error");
  });

  it("switches to a monospace font when isMonospace", () => {
    render(<Caption isMonospace>ABC-123</Caption>);
    const el = screen.getByText("ABC-123");
    expect(el).toHaveClass("font-mono");
    expect(el).not.toHaveClass("font-sans");
  });

  it("renders the element from `as`", () => {
    render(<Caption as="p">Para</Caption>);
    expect(screen.getByText("Para").tagName).toBe("P");
  });
});
