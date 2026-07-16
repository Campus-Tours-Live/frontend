import { render, screen } from "@testing-library/react";
import { SectionHeading } from "@/components/ui/layout/SectionHeading";

describe("SectionHeading", () => {
  it("renders the title (required)", () => {
    render(<SectionHeading title="Our tours" />);
    expect(screen.getByRole("heading", { name: "Our tours" })).toBeInTheDocument();
  });

  it("renders eyebrow and lead when provided", () => {
    render(<SectionHeading eyebrow="Explore" title="Our tours" lead="Find the perfect campus." />);
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Find the perfect campus.")).toBeInTheDocument();
  });

  it("omits eyebrow and lead when not provided", () => {
    const { container } = render(<SectionHeading title="Solo" />);
    expect(container.querySelector(".eyebrow")).not.toBeInTheDocument();
    expect(container.querySelector(".lead")).not.toBeInTheDocument();
  });

  it.each([
    [1, "H1", "h1"],
    [2, "H2", "h2"],
    [3, "H3", "h3"],
    [4, "H4", "h4"],
  ] as const)("level %s renders <%s> with class %s", (level, tag, cls) => {
    render(<SectionHeading level={level} title="t" />);
    const heading = screen.getByRole("heading", { name: "t" });
    expect(heading.tagName).toBe(tag);
    expect(heading).toHaveClass(cls);
  });

  it("defaults to level 2 (h2)", () => {
    render(<SectionHeading title="t" />);
    expect(screen.getByRole("heading", { name: "t" }).tagName).toBe("H2");
  });

  it("applies titleId to the heading element", () => {
    render(<SectionHeading title="t" titleId="my-title" />);
    expect(screen.getByRole("heading", { name: "t" })).toHaveAttribute("id", "my-title");
  });

  it("align='center' adds text-center on the wrapper and mx-auto on the lead", () => {
    const { container } = render(<SectionHeading title="t" lead="l" align="center" />);
    expect(container.firstChild).toHaveClass("text-center");
    expect(screen.getByText("l")).toHaveClass("mx-auto");
  });

  it("align='left' (default) does not add text-center", () => {
    const { container } = render(<SectionHeading title="t" />);
    expect(container.firstChild).not.toHaveClass("text-center");
  });

  it("merges a custom className onto the wrapper", () => {
    const { container } = render(<SectionHeading title="t" className="extra" />);
    expect(container.firstChild).toHaveClass("extra");
  });
});
