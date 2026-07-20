import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "lucide-react";
import { HeaderNav } from "@/components/site/HeaderNav";
import { useMe } from "@/lib/data-access";
import { submitLogout } from "@/lib/auth/logout";

jest.mock("@/lib/auth/logout", () => ({ submitLogout: jest.fn() }));

jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn() }),
}));

// NAV_LINKS is intentionally [] in production (see NavLinks.ts), which every other test in this
// file relies on. A getter (read fresh on each property access) lets one test below flip it to a
// non-empty vocabulary to exercise the inline-link render branch the real data never reaches
// today, without disturbing the empty default the rest of the suite exercises.
let navLinks: { label: string; href: string; icon: typeof Home }[] = [];
jest.mock("@/components/site/NavLinks", () => ({
  get NAV_LINKS() {
    return navLinks;
  },
}));

type MePartial = {
  displayName?: string | null;
  firstName?: string | null;
};

function setupMe(me: MePartial | null, opts?: { isLoading?: boolean; isOnboarded?: boolean }) {
  (useMe as jest.Mock).mockReturnValue({
    me,
    isLoading: opts?.isLoading ?? false,
    isOnboarded: opts?.isOnboarded ?? false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  navLinks = [];
});

describe("HeaderNav — primary nav links (removed)", () => {
  it("renders no primary nav links", () => {
    setupMe(null, { isOnboarded: false });

    render(<HeaderNav />);

    expect(screen.queryByRole("link", { name: "Explore tours" })).not.toBeInTheDocument();
    expect(screen.queryByText("How it works")).not.toBeInTheDocument();
    expect(screen.queryByText("For students & parents")).not.toBeInTheDocument();
  });
});

describe("HeaderNav — primary nav links present (future-proofing)", () => {
  it("renders each NAV_LINKS entry as an inline link", () => {
    navLinks = [{ label: "Explore tours", href: "/tours", icon: Home }];
    setupMe(null, { isOnboarded: false });

    render(<HeaderNav />);

    expect(screen.getByRole("link", { name: "Explore tours" })).toHaveAttribute("href", "/tours");
  });
});

describe("HeaderNav — logged out (not onboarded)", () => {
  beforeEach(() => {
    setupMe(null, { isOnboarded: false });
  });

  it("shows the 'Account' trigger (not a greeting)", () => {
    render(<HeaderNav />);

    expect(screen.getByRole("button", { name: /Account/ })).toBeInTheDocument();
    expect(screen.queryByText(/^Hi/)).not.toBeInTheDocument();
  });

  it("reveals the sign-in CTA in the dropdown on click", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);

    await user.click(screen.getByRole("button", { name: /Account/ }));

    const cta = screen.getByRole("link", { name: "Sign in or Join Now" });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/signin");
  });

  it("routes the common shortcuts through sign-in (returnTo)", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);

    await user.click(screen.getByRole("button", { name: /Account/ }));

    const dashboard = screen.getByRole("menuitem", { name: "Dashboard" });
    expect(dashboard).toHaveAttribute("href", "/auth/login?intent=signin&returnTo=%2Fdashboard");
    // Logged-out menu must NOT offer "Sign out".
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});

describe("HeaderNav — logged in (onboarded)", () => {
  beforeEach(() => {
    setupMe({ displayName: "Ada Lovelace" }, { isOnboarded: true });
  });

  it("greets the member by first name", () => {
    render(<HeaderNav />);

    expect(screen.getByRole("button", { name: /Hi, Ada/ })).toBeInTheDocument();
  });

  it("falls back to firstName when displayName is absent", () => {
    setupMe({ firstName: "Grace" }, { isOnboarded: true });

    render(<HeaderNav />);

    expect(screen.getByRole("button", { name: /Hi, Grace/ })).toBeInTheDocument();
  });

  it("renders 'Hi' with no name when no name fields are present", () => {
    setupMe({}, { isOnboarded: true });

    render(<HeaderNav />);

    const trigger = screen.getByRole("button", { name: /Hi/ });
    expect(trigger).toHaveTextContent("Hi");
    expect(trigger).not.toHaveTextContent(/Hi,/);
  });

  it("shows the account menu items and a Sign out link on click", async () => {
    const user = userEvent.setup();
    render(<HeaderNav />);

    await user.click(screen.getByRole("button", { name: /Hi, Ada/ }));

    expect(screen.getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    // Sign out is a POST (not a CSRF-forgeable GET link) — a button that submits the logout form.
    const signOut = screen.getByRole("menuitem", { name: "Sign out" });
    expect(signOut).not.toHaveAttribute("href");
    await user.click(signOut);
    expect(submitLogout).toHaveBeenCalled();
    // Logged-in menu must NOT show the public sign-in CTA.
    expect(screen.queryByText("Sign in or Join Now")).not.toBeInTheDocument();
  });

  it("hides the Dashboard item when showDashboard is false", async () => {
    const user = userEvent.setup();
    render(<HeaderNav showDashboard={false} />);

    await user.click(screen.getByRole("button", { name: /Hi, Ada/ }));

    expect(screen.queryByRole("menuitem", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });
});

describe("HeaderNav — loading / auth-actions gate", () => {
  it("hides the account trigger while loading", () => {
    setupMe(null, { isLoading: true, isOnboarded: false });

    render(<HeaderNav />);

    expect(screen.queryByRole("button", { name: /Account/ })).not.toBeInTheDocument();
  });

  it("hides the account trigger when showAuthActions is false", () => {
    setupMe({ displayName: "Ada" }, { isOnboarded: true });

    render(<HeaderNav showAuthActions={false} />);

    expect(screen.queryByRole("button", { name: /Hi/ })).not.toBeInTheDocument();
  });
});
