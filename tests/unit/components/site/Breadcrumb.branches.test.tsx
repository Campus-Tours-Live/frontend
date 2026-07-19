import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { Breadcrumb } from "@/components/site/Breadcrumb";

describe("Breadcrumb (items adapter over the shared UI Breadcrumb)", () => {
  it("links non-current crumbs and marks the last as the current page", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Sign up", href: "/signup/role" },
          { label: "Guide" }, // last → current (non-link)
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup/role");
    expect(screen.queryByRole("link", { name: "Guide" })).not.toBeInTheDocument();
    expect(screen.getByText("Guide")).toHaveAttribute("aria-current", "page");
  });
});
