import { render } from "@testing-library/react";
import { ChevronLeft } from "lucide-react";
import { Icon } from "@/components/ui/icon/Icon";

describe("Icon", () => {
  it("renders a lucide glyph passed via `icon` (decorative by default)", () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("shrink-0");
  });

  it("renders a glyph by registry `name`", () => {
    const { container } = render(<Icon name="chevronLeft" size={14} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "14");
  });

  it("becomes a labelled image when given a `title`", () => {
    const { container } = render(<Icon name="info" title="Info" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Info");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });
});
