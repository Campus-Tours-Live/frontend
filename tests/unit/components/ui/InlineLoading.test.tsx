import { render, screen } from "@testing-library/react";
import { InlineLoading } from "@/components/ui";

describe("InlineLoading", () => {
  it("renders the label inside a status region", () => {
    render(<InlineLoading label="Loading availability…" />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading availability…");
  });

  it("merges extra className", () => {
    render(<InlineLoading label="Loading…" className="mt-4" />);
    expect(screen.getByRole("status")).toHaveClass("mt-4", "flex", "items-center");
  });
});
