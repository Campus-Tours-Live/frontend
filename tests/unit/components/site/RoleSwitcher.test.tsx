import { render, screen } from "@testing-library/react";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import userEvent from "@testing-library/user-event";
import { RoleSwitcher } from "@/components/site/RoleSwitcher";
import { useMe, useParticipantProfile, useSetCurrentRole } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
  useParticipantProfile: jest.fn(),
  useSetCurrentRole: jest.fn(),
}));

type MePartial = {
  currentRole?: string | null;
  roles?: string[];
};

function setupMe(me: MePartial | null) {
  const roles = me?.roles ?? [];
  (useMe as jest.Mock).mockReturnValue({
    me,
    hasRole: (r: string) => roles.includes(r),
  });
}

/** The PARENT-hides-guide-CTA signal now comes from useParticipantProfile().type. */
function setupParticipantProfile(type: string | null = null, opts?: { isLoading?: boolean }) {
  (useParticipantProfile as jest.Mock).mockReturnValue({
    data: { type },
    isLoading: opts?.isLoading ?? false,
  });
}

function setupSetCurrentRole(opts?: { mutateAsync?: jest.Mock; isPending?: boolean }) {
  const mutateAsync = opts?.mutateAsync ?? jest.fn().mockResolvedValue({});
  (useSetCurrentRole as jest.Mock).mockReturnValue({
    mutateAsync,
    isPending: opts?.isPending ?? false,
  });
  return mutateAsync;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupParticipantProfile();
});

describe("RoleSwitcher — holds BOTH roles (segmented toggle)", () => {
  it("renders a Participant/Guide toggle with the active side pressed", () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetCurrentRole();

    render(<RoleSwitcher />);

    const participant = screen.getByRole("button", { name: "Participant" });
    const guide = screen.getByRole("button", { name: "Guide" });

    expect(participant).toHaveAttribute("aria-pressed", "true");
    // SegmentedControl doesn't disable the active option (clicking it is a no-op — see below).
    expect(participant).toBeEnabled();
    expect(guide).toHaveAttribute("aria-pressed", "false");
    expect(guide).toBeEnabled();
    expect(screen.getByRole("group", { name: "Current role" })).toBeInTheDocument();
  });

  it("clicking Guide calls setCurrentRole.mutateAsync('GUIDE')", async () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    const mutateAsync = setupSetCurrentRole();

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith("GUIDE");
  });

  it("invokes onNavigate after a successful switch", async () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetCurrentRole();
    const onNavigate = jest.fn();

    render(<RoleSwitcher onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("when currentRole=GUIDE, the Guide side is active (pressed)", () => {
    setupMe({
      currentRole: "GUIDE",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetCurrentRole();

    render(<RoleSwitcher />);

    const participant = screen.getByRole("button", { name: "Participant" });
    const guide = screen.getByRole("button", { name: "Guide" });

    expect(guide).toHaveAttribute("aria-pressed", "true");
    expect(guide).toBeEnabled();
    expect(participant).toHaveAttribute("aria-pressed", "false");
    expect(participant).toBeEnabled();
  });

  it("clicking the already-active side does not call mutateAsync", async () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    const mutateAsync = setupSetCurrentRole();

    render(<RoleSwitcher />);

    // Active button is disabled; userEvent respects pointer-events/disabled.
    await userEvent.click(screen.getByRole("button", { name: "Participant" }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces an error Alert when the switch rejects", async () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetCurrentRole({
      mutateAsync: jest.fn().mockRejectedValue(new Error("403")),
    });

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(await screen.findByText(/couldn.t switch right now/i)).toBeInTheDocument();
  });

  it("attributes a dismissed sign-in prompt to auth, not to the switch failing", async () => {
    // N1a Symptom A′: the role switch never ran, so "couldn't switch right now, please try
    // again" would send the user retrying an action that was never the problem.
    setupMe({ currentRole: "PARTICIPANT", roles: ["PARTICIPANT", "GUIDE"] });
    setupSetCurrentRole({
      mutateAsync: jest.fn().mockRejectedValue(new AuthCancelledError()),
    });

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t switch right now/i)).not.toBeInTheDocument();
  });

  it("disables both toggle buttons while a switch is pending", () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetCurrentRole({ isPending: true });

    render(<RoleSwitcher />);

    expect(screen.getByRole("button", { name: "Participant" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guide" })).toBeDisabled();
  });
});

describe("RoleSwitcher — holds ONE role (become the other, in-app navigation)", () => {
  it("GUIDE only → 'Become a Participant' navigates to /onboarding/participant (no mutation, no /auth/login)", async () => {
    setupMe({ currentRole: "GUIDE", roles: ["GUIDE"] });
    setupSetCurrentRole();
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    const btn = screen.getByRole("button", { name: /become a participant/i });
    await userEvent.click(btn);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/onboarding/participant");
    const url = navigate.mock.calls[0][0] as string;
    expect(url).not.toContain("/auth/login");
  });

  it("PARTICIPANT only (not parent) → 'Become a Guide' navigates to /onboarding/guide", async () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile("STUDENT");
    setupSetCurrentRole();
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    const btn = screen.getByRole("button", { name: /become a guide/i });
    await userEvent.click(btn);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/onboarding/guide");
  });

  it("calls onNavigate before navigating", async () => {
    setupMe({ currentRole: "GUIDE", roles: ["GUIDE"] });
    setupSetCurrentRole();
    const onNavigate = jest.fn();
    const navigate = jest.fn();

    render(<RoleSwitcher onNavigate={onNavigate} navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("without a navigate prop, falls back to window.location.assign with the onboarding path", async () => {
    setupMe({ currentRole: "GUIDE", roles: ["GUIDE"] });
    setupSetCurrentRole();
    const assign = jest.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, assign },
    });

    try {
      render(<RoleSwitcher />);
      await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith("/onboarding/participant");
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});

describe("RoleSwitcher — renders nothing", () => {
  it("PARTICIPANT only + type=PARENT → empty (can't become a guide)", () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile("PARENT");
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("PARTICIPANT only, participant profile still loading → empty (hold off until known)", () => {
    setupMe({
      currentRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile(null, { isLoading: true });
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("currentRole=null → empty", () => {
    setupMe({ currentRole: null, roles: [] });
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("currentRole=ADMIN → empty", () => {
    setupMe({ currentRole: "ADMIN", roles: ["ADMIN"] });
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("currentRole=SUPPORT → empty", () => {
    setupMe({ currentRole: "SUPPORT", roles: ["SUPPORT"] });
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("me=null → empty", () => {
    setupMe(null);
    setupSetCurrentRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
