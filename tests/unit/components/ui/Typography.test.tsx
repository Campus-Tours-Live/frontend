import { render, screen } from "@testing-library/react";
import { Heading } from "@/components/ui/Heading";
import { Body } from "@/components/ui/Body";

describe("Heading", () => {
  it("renders the semantic tag from `as` (independent of size)", () => {
    render(
      <Heading as="h3" size="lg">
        Weekly hours
      </Heading>,
    );
    const el = screen.getByRole("heading", { level: 3, name: "Weekly hours" });
    expect(el.tagName).toBe("H3");
    expect(el).toHaveClass("font-display", "text-[20px]", "font-bold", "text-ink");
  });

  it("maps weight and color tokens to classes", () => {
    render(
      <Heading as="h2" weight={600} color="primary">
        Title
      </Heading>,
    );
    const el = screen.getByRole("heading", { name: "Title" });
    expect(el).toHaveClass("font-semibold", "text-primary");
  });
});

describe("Body", () => {
  it("renders a <p> by default with the sans font + size/color tokens", () => {
    render(<Body color="muted">Some copy</Body>);
    const el = screen.getByText("Some copy");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("font-sans", "text-[14px]", "font-normal", "text-ink-soft");
  });

  it("can render as a span", () => {
    render(
      <Body as="span" size="sm" weight={700}>
        inline
      </Body>,
    );
    const el = screen.getByText("inline");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("text-[13px]", "font-bold");
  });
});
