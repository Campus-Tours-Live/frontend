import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/feedback/Skeleton";
import { SkeletonText } from "@/components/ui/feedback/SkeletonText";

describe("Skeleton", () => {
  it("applies width/height and the rectangle radius by default", () => {
    const { container } = render(<Skeleton width="50%" height={60} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("animate-pulse", "rounded-md");
    expect(el).toHaveStyle({ width: "50%", height: "60px" });
    expect(el).toHaveAttribute("aria-hidden");
  });

  it("uses a fully-rounded radius for the rounded variant", () => {
    const { container } = render(<Skeleton variant="rounded" width={40} height={40} />);
    expect(container.firstChild).toHaveClass("rounded-pill");
  });
});

describe("SkeletonText", () => {
  it("renders 3 lines by default, last one shortened", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toHaveStyle({ width: "60%" });
    expect(lines[0]).toHaveStyle({ width: "100%" });
  });

  it("honours the lines prop and keeps a single line full-width", () => {
    const { container } = render(<SkeletonText lines={1} />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveStyle({ width: "100%" });
  });
});
