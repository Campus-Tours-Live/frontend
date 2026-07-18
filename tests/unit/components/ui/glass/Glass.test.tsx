import { render, screen } from "@testing-library/react";
import { Glass, glassClass, GLASS_BASE } from "@/components/ui/glass/Glass";

describe("Glass", () => {
  it("renders a div with the light tone (brand off-white, not pure white) by default", () => {
    render(<Glass data-testid="g">frosted</Glass>);
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("backdrop-blur-md", "border-ivory/40", "bg-ivory/25", "text-ivory");
  });

  it("applies the dark tone for light grounds", () => {
    render(
      <Glass tone="dark" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g")).toHaveClass("bg-card/70", "text-ink");
  });

  it("renders a custom element via `as`, merges className and forwards props", () => {
    render(
      <Glass as="section" className="rounded-panel" data-testid="g">
        x
      </Glass>,
    );
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("rounded-panel", "backdrop-blur-md");
  });

  it("glassClass composes the shared base + tone + extra classes", () => {
    const cls = glassClass("light", "hover:bg-ivory/40");
    expect(cls).toContain("backdrop-blur-md");
    expect(cls).toContain("border-ivory/40");
    expect(cls).toContain("hover:bg-ivory/40");
    expect(GLASS_BASE).toContain("backdrop-blur-md");
  });
});
