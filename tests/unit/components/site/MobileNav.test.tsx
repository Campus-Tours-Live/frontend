import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "lucide-react";
import { MobileNav } from "@/components/site/MobileNav";
import { useMe } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn() }),
}));
// Keep MobileNav focused: AccountNav has its own data deps + tests.
jest.mock("@/components/site/AccountNav", () => ({
  AccountNav: () => <div data-testid="account-nav" />,
}));

// NAV_LINKS is intentionally [] in production (see NavLinks.ts — "the header keeps only the
// global search + account menu"), which every other test in this file relies on. A getter (read
// fresh on each property access, unlike a destructured import) lets one test below flip it to a
// non-empty vocabulary to exercise the Discover-section render branch the real data never reaches
// today, without disturbing the empty default the rest of the suite exercises.
let navLinks: { label: string; href: string; icon: typeof Home }[] = [];
jest.mock("@/components/site/NavLinks", () => ({
  get NAV_LINKS() {
    return navLinks;
  },
}));

function setupMe(opts?: { isLoading?: boolean; isOnboarded?: boolean }) {
  (useMe as jest.Mock).mockReturnValue({
    me: opts?.isOnboarded ? { displayName: "Ada" } : null,
    isLoading: opts?.isLoading ?? false,
    isOnboarded: opts?.isOnboarded ?? false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  navLinks = [];
});

describe("MobileNav — drawer toggle", () => {
  it("is closed by default (button not expanded)", () => {
    setupMe({ isOnboarded: false });

    render(<MobileNav />);

    const openBtn = screen.getByRole("button", { name: "Open menu" });
    expect(openBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the drawer on click and exposes the close control", async () => {
    const user = userEvent.setup();
    setupMe({ isOnboarded: false });

    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });

  it("closes the drawer when the close control is clicked", async () => {
    const user = userEvent.setup();
    setupMe({ isOnboarded: false });

    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("MobileNav — primary links (removed)", () => {
  it("renders no Discover nav section", async () => {
    const user = userEvent.setup();
    setupMe({ isOnboarded: false });

    render(<MobileNav />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.queryByText("Discover")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explore tours" })).not.toBeInTheDocument();
    expect(screen.queryByText("How it works")).not.toBeInTheDocument();
    expect(screen.queryByText("For students & parents")).not.toBeInTheDocument();
  });
});

describe("MobileNav — primary links present (future-proofing the Discover section)", () => {
  it("renders a Discover section item when NAV_LINKS has entries", async () => {
    navLinks = [{ label: "Explore tours", href: "/tours", icon: Home }];
    const user = userEvent.setup();
    setupMe({ isOnboarded: false });

    render(<MobileNav />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore tours" })).toHaveAttribute("href", "/tours");
  });
});

describe("MobileNav — logged out (not onboarded)", () => {
  beforeEach(() => setupMe({ isOnboarded: false }));

  it("shows the sign-in CTA and hides AccountNav + Sign out", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const cta = screen.getByRole("link", { name: "Sign in or Join Now" });
    expect(cta).toHaveAttribute("href", "/signin");
    expect(screen.queryByTestId("account-nav")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});

describe("MobileNav — logged in (onboarded)", () => {
  beforeEach(() => setupMe({ isOnboarded: true }));

  it("renders AccountNav and a Sign out link, hides the sign-in CTA", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByTestId("account-nav")).toBeInTheDocument();
    const signOut = screen.getByRole("link", { name: "Sign out" });
    expect(signOut).toHaveAttribute("href", "/auth/logout");
    expect(screen.queryByText("Sign in or Join Now")).not.toBeInTheDocument();
  });
});

describe("MobileNav — auth-actions gate", () => {
  it("hides the logged-out welcome card while loading", async () => {
    const user = userEvent.setup();
    setupMe({ isLoading: true, isOnboarded: false });

    render(<MobileNav />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.queryByText("Sign in or Join Now")).not.toBeInTheDocument();
  });

  it("hides the welcome card when showAuthActions is false (logged out)", async () => {
    const user = userEvent.setup();
    setupMe({ isOnboarded: false });

    render(<MobileNav showAuthActions={false} />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.queryByText("Sign in or Join Now")).not.toBeInTheDocument();
  });

  it("hides Sign out when showAuthActions is false (logged in)", async () => {
    const user = userEvent.setup();
    setupMe({ isOnboarded: true });

    render(<MobileNav showAuthActions={false} />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // AccountNav still renders (it is not gated by showAuthActions).
    expect(screen.getByTestId("account-nav")).toBeInTheDocument();
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});
