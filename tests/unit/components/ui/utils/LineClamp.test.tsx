import { render, screen } from "@testing-library/react";
import { LineClamp } from "@/components/ui/utils/LineClamp";

describe("LineClamp", () => {
  it("clamps to 2 lines by default via the line-clamp utility", () => {
    render(<LineClamp>Some long text</LineClamp>);
    expect(screen.getByText("Some long text")).toHaveClass("line-clamp-2");
  });

  it("honours a custom line count and merges className", () => {
    render(
      <LineClamp lines={4} className="italic">
        More text
      </LineClamp>,
    );
    const el = screen.getByText("More text");
    expect(el).toHaveClass("line-clamp-4", "italic");
  });

  it("falls back to inline styles for counts beyond the utility range", () => {
    render(<LineClamp lines={8}>Way too much text</LineClamp>);
    const el = screen.getByText("Way too much text");
    expect(el).not.toHaveClass("line-clamp-8");
    expect((el.style as unknown as Record<string, string>).WebkitLineClamp).toBe("8");
  });

  it("forwards native props", () => {
    render(<LineClamp title="full text">x</LineClamp>);
    expect(screen.getByText("x")).toHaveAttribute("title", "full text");
  });
});
