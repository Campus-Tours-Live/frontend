import { render, screen } from "@testing-library/react";
import { AccountNav } from "@/components/site/AccountNav";
import { useGuideProfile, useMe } from "@/lib/data-access";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));
jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(),
  useGuideProfile: jest.fn(),
}));
// Isolate AccountNav from the RoleSwitcher's own data dependencies.
jest.mock("@/components/site/RoleSwitcher", () => ({
  RoleSwitcher: () => <div data-testid="role-switcher" />,
}));

type MePartial = {
  activeRole?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  roles?: string[];
};

function setupMe(me: MePartial | null, opts?: { isOnboarded?: boolean }) {
  const roles = me?.roles ?? (me ? ["PARTICIPANT"] : []);
  (useMe as jest.Mock).mockReturnValue({
    me: me
      ? {
          activeRole: me.activeRole,
          roles: me.roles,
          user: { displayName: me.displayName, firstName: me.firstName },
        }
      : null,
    isOnboarded: opts?.isOnboarded ?? (!!me && roles.length > 0),
  });
}

/** Guide application status now comes from useGuideProfile(), not me.guideStatus. */
function setupGuideProfile(guideStatus: string | null = null) {
  (useGuideProfile as jest.Mock).mockReturnValue({ data: { guideStatus } });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupGuideProfile();
});

describe("AccountNav — render gate", () => {
  it("renders nothing when not onboarded", () => {
    setupMe({ activeRole: "PARTICIPANT" }, { isOnboarded: false });

    const { container } = render(<AccountNav />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when me is null", () => {
    setupMe(null);

    const { container } = render(<AccountNav />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("AccountNav — participant", () => {
  beforeEach(() => {
    setupMe(
      {
        activeRole: "PARTICIPANT",
        displayName: "Ada Lovelace",
        roles: ["PARTICIPANT"],
      },
      { isOnboarded: true },
    );
  });

  it("renders the participant nav (My bookings / Guardian & consent)", () => {
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Explore tours" })).toHaveAttribute("href", "/tours");
    expect(screen.getByText("My bookings")).toBeInTheDocument();
    expect(screen.getByText("Guardian & consent")).toBeInTheDocument();
    // Guide-only items must NOT appear.
    expect(screen.queryByText("Earnings")).not.toBeInTheDocument();
    expect(screen.queryByText("Verification")).not.toBeInTheDocument();
  });

  it("shows the participant subtitle and a greeting with the first name", () => {
    render(<AccountNav />);

    expect(screen.getByText("Participant account")).toBeInTheDocument();
    expect(screen.getByText(/Hi, Ada!/)).toBeInTheDocument();
  });

  it("renders the RoleSwitcher", () => {
    render(<AccountNav />);

    expect(screen.getByTestId("role-switcher")).toBeInTheDocument();
  });

  it("links Profile to /profile", () => {
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });
});

describe("AccountNav — guide", () => {
  it("renders the guide nav (Upcoming tours / Earnings / Verification)", () => {
    setupMe(
      {
        activeRole: "GUIDE",
        firstName: "Grace",
        roles: ["GUIDE"],
      },
      { isOnboarded: true },
    );
    setupGuideProfile("VERIFIED");

    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Explore tours" })).toHaveAttribute("href", "/tours");
    expect(screen.getByText("Upcoming tours")).toBeInTheDocument();
    // "Earnings" is both a section label and an item; assert the item button.
    expect(screen.getByRole("button", { name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
    // Participant-only items must NOT appear.
    expect(screen.queryByText("My bookings")).not.toBeInTheDocument();
    expect(screen.queryByText("Guardian & consent")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("shows the default 'Guide account' subtitle when not pending verification", () => {
    setupMe(
      {
        activeRole: "GUIDE",
        roles: ["GUIDE"],
      },
      { isOnboarded: true },
    );
    setupGuideProfile("VERIFIED");

    render(<AccountNav />);

    expect(screen.getByText("Guide account")).toBeInTheDocument();
  });

  it("shows 'pending verification' subtitle when guideStatus=PENDING", () => {
    setupMe(
      {
        activeRole: "GUIDE",
        roles: ["GUIDE"],
      },
      { isOnboarded: true },
    );
    setupGuideProfile("PENDING");

    render(<AccountNav />);

    expect(screen.getByText("Guide · pending verification")).toBeInTheDocument();
  });

  it("shows the default 'Guide account' subtitle while the guide profile is still loading", () => {
    setupMe(
      {
        activeRole: "GUIDE",
        roles: ["GUIDE"],
      },
      { isOnboarded: true },
    );
    (useGuideProfile as jest.Mock).mockReturnValue({ data: undefined });

    render(<AccountNav />);

    expect(screen.getByText("Guide account")).toBeInTheDocument();
  });
});

describe("AccountNav — defaults", () => {
  it("falls back to the participant nav when activeRole is null", () => {
    setupMe({ activeRole: null, roles: ["PARTICIPANT"] }, { isOnboarded: true });

    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Explore tours" })).toHaveAttribute("href", "/tours");
    expect(screen.getByText("My bookings")).toBeInTheDocument();
    expect(screen.getByText("Participant account")).toBeInTheDocument();
  });
});
