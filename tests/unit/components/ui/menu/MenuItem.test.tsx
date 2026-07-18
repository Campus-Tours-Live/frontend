import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "lucide-react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, onClick, ...props }: any) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

import { MenuItem } from "@/components/ui/menu/MenuItem";

describe("MenuItem — element type", () => {
  it("renders an inert <button> when no href", () => {
    render(<MenuItem>Settings</MenuItem>);
    const btn = screen.getByRole("button", { name: "Settings" });
    expect(btn).toHaveAttribute("type", "button");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a client Link (anchor) when href is an internal route", () => {
    render(<MenuItem href="/dashboard">Dashboard</MenuItem>);
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});

describe("MenuItem — onSelect", () => {
  it("fires onSelect when an inert button is clicked", async () => {
    const onSelect = jest.fn();
    render(<MenuItem onSelect={onSelect}>Logout</MenuItem>);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("fires onSelect (via onClick) when a link item is clicked", async () => {
    const onSelect = jest.fn();
    render(
      <MenuItem href="/profile" onSelect={onSelect}>
        Profile
      </MenuItem>,
    );
    await userEvent.click(screen.getByRole("link"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("MenuItem — variant classes", () => {
  it("row variant (default) applies the row base class", () => {
    render(<MenuItem>Row</MenuItem>);
    expect(screen.getByRole("button")).toHaveClass("rounded-card");
  });

  it("pill variant applies the pill base class", () => {
    render(<MenuItem variant="pill">Pill</MenuItem>);
    expect(screen.getByRole("button")).toHaveClass("rounded-pill");
  });

  it("renders a leading icon when provided", () => {
    const { container } = render(<MenuItem icon={Home}>Home</MenuItem>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("MenuItem — active state", () => {
  it("active link sets aria-current='page' and the active classes", () => {
    render(
      <MenuItem href="/dashboard" active>
        Dashboard
      </MenuItem>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("bg-primary-soft");
  });

  it("inactive link has no aria-current", () => {
    render(<MenuItem href="/dashboard">Dashboard</MenuItem>);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("passes role through (e.g. menuitem) onto the button", () => {
    render(<MenuItem role="menuitem">Item</MenuItem>);
    expect(screen.getByRole("menuitem")).toBeInTheDocument();
  });
});
