import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/ui";

describe("PageHeader", () => {
  it("renders the title as a level-1 heading with the lead", () => {
    render(<PageHeader title="Availability" lead="Manage when participants book you." />);

    const heading = screen.getByRole("heading", { name: "Availability" });
    expect(heading.tagName).toBe("H1");
    expect(screen.getByText("Manage when participants book you.")).toBeInTheDocument();
  });

  it("respects a custom heading level", () => {
    render(<PageHeader title="Section" level={2} />);
    expect(screen.getByRole("heading", { name: "Section" }).tagName).toBe("H2");
  });

  it("renders without the action row when no action is given", () => {
    render(<PageHeader title="Plain" />);
    // No action → the heading is not wrapped in the responsive justify-between row.
    const heading = screen.getByRole("heading", { name: "Plain" });
    expect(heading.closest(".sm\\:justify-between")).toBeNull();
  });

  it("lays out the action beside the title in the shared responsive row", () => {
    render(<PageHeader title="Tour offerings" action={<a href="/new">Create tour offering</a>} />);

    const action = screen.getByRole("link", { name: "Create tour offering" });
    expect(action).toBeInTheDocument();
    // Title + action share one row that stacks on mobile and splits from `sm` up.
    const row = screen
      .getByRole("heading", { name: "Tour offerings" })
      .closest(".sm\\:justify-between") as HTMLElement;
    expect(row).not.toBeNull();
    expect(row).toHaveClass("flex-col", "sm:flex-row", "sm:items-end");
    expect(row).toContainElement(action);
  });
});
