import { render, screen } from "@testing-library/react";
import { Glass, glassClass, GLASS_BASE } from "@/components/ui/glass/Glass";

/**
 * The material itself (blur radius, backdrop saturation, specular edge, contact shadow) lives in
 * `globals.css` under "Glass", so these tests pin the CONTRACT — which tone maps to which class —
 * rather than re-asserting CSS values Jest cannot evaluate anyway. What matters here is that a tone
 * is never silently substituted: each is a claim about the ground behind it, and picking the wrong
 * one is exactly how the tour card's save heart ended up invisible on a pale campus illustration.
 */
describe("Glass", () => {
  it("renders a div with the light tone (for dark / photo grounds) by default", () => {
    render(<Glass data-testid="g">frosted</Glass>);
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("glass", "glass-light");
  });

  it("applies the dark tone for light grounds", () => {
    render(
      <Glass tone="dark" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g")).toHaveClass("glass", "glass-dark");
  });

  /**
   * `smoke` is the tone for ARBITRARY imagery — a thin ink material under a light glyph, which is
   * what iOS ships for controls over photos. It exists because neither `light` nor `dark` survives
   * both a pale illustration and a dark photo, and CSS cannot sample backdrop luminance to switch
   * between them the way iOS does.
   */
  it("applies the smoke tone, the one that survives both pale and dark grounds", () => {
    render(
      <Glass tone="smoke" data-testid="g">
        x
      </Glass>,
    );
    const el = screen.getByTestId("g");
    expect(el).toHaveClass("glass", "glass-smoke");
    expect(el).not.toHaveClass("glass-light", "glass-dark");
  });

  it("renders a custom element via `as`, merges className and forwards props", () => {
    render(
      <Glass as="section" className="rounded-panel" data-testid="g">
        x
      </Glass>,
    );
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("rounded-panel", "glass");
  });

  it("glassClass composes the shared material + tone + extra classes", () => {
    const cls = glassClass("smoke", "hover:bg-ink/32");
    expect(cls).toContain("glass");
    expect(cls).toContain("glass-smoke");
    expect(cls).toContain("hover:bg-ink/32");
    expect(GLASS_BASE).toBe("glass");
  });

  it("glassClass defaults tone to light when omitted", () => {
    expect(glassClass()).toContain("glass-light");
  });
});
