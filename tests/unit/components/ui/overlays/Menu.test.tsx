import { render, screen } from "@testing-library/react";
import { MenuSection } from "@/components/ui/overlays/Menu";

describe("MenuSection", () => {
  it("renders its children inside a list", () => {
    render(
      <MenuSection>
        <li>One</li>
        <li>Two</li>
      </MenuSection>,
    );
    const list = screen.getByRole("list");
    expect(list.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders an uppercase label header when label is set", () => {
    render(
      <MenuSection label="Account">
        <li>x</li>
      </MenuSection>,
    );
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("omits the header when label is not set", () => {
    const { container } = render(
      <MenuSection>
        <li>x</li>
      </MenuSection>,
    );
    // Only the ul wraps content; no preceding label div text.
    expect(container.textContent).toBe("x");
  });

  it("adds a top divider when bordered", () => {
    const { container } = render(
      <MenuSection bordered>
        <li>x</li>
      </MenuSection>,
    );
    expect(container.firstChild).toHaveClass("border-t");
  });

  it("has no top divider by default", () => {
    const { container } = render(
      <MenuSection>
        <li>x</li>
      </MenuSection>,
    );
    expect(container.firstChild).not.toHaveClass("border-t");
  });

  it("merges a custom className", () => {
    const { container } = render(
      <MenuSection className="extra">
        <li>x</li>
      </MenuSection>,
    );
    expect(container.firstChild).toHaveClass("py-4", "extra");
  });
});
