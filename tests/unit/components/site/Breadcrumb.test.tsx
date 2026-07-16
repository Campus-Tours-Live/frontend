import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "@/components/site/Breadcrumb";

describe("Breadcrumb", () => {
  it("links all but the last crumb and marks the last as current", () => {
    render(<Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sign up" }]} />);
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/");

    const current = screen.getByText("Sign up");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Sign up" })).not.toBeInTheDocument();
  });

  it("renders an accessible breadcrumb landmark", () => {
    render(<Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sign up" }]} />);
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
  });
});
