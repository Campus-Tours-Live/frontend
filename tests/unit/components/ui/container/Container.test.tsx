import { render, screen } from "@testing-library/react";
import { Container } from "@/components/ui";

describe("Container", () => {
  it("renders a div with the shared centered content frame by default", () => {
    render(<Container data-testid="c">hi</Container>);
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("mx-auto", "max-w-content", "px-6");
    expect(el).toHaveTextContent("hi");
  });

  it("renders the element from `as` and forwards className/attrs", () => {
    render(
      <Container as="section" className="py-10" aria-label="Results" data-testid="c">
        x
      </Container>,
    );
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("mx-auto", "max-w-content", "px-6", "py-10");
    expect(el).toHaveAttribute("aria-label", "Results");
  });

  it("width='wide' relaxes the cap on large screens", () => {
    render(
      <Container width="wide" data-testid="c">
        x
      </Container>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("max-w-content", "xl:max-w-[1280px]", "2xl:max-w-[1400px]");
  });
});
