import { render, screen } from "@testing-library/react";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import userEvent from "@testing-library/user-event";
import { RoleSwitcher } from "@/components/site/RoleSwitcher";
import {
  ApiError,
  useMe,
  useParticipantProfile,
  useSetActiveRole,
  useSetOnboardingRole,
} from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
  useParticipantProfile: jest.fn(),
  useSetActiveRole: jest.fn(),
  useSetOnboardingRole: jest.fn(),
}));

type MePartial = {
  activeRole?: string | null;
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

function setupSetActiveRole(opts?: { mutateAsync?: jest.Mock; isPending?: boolean }) {
  const mutateAsync = opts?.mutateAsync ?? jest.fn().mockResolvedValue({});
  (useSetActiveRole as jest.Mock).mockReturnValue({
    mutateAsync,
    isPending: opts?.isPending ?? false,
  });
  return mutateAsync;
}

function setupSetOnboardingRole(opts?: { mutateAsync?: jest.Mock; isPending?: boolean }) {
  const mutateAsync = opts?.mutateAsync ?? jest.fn().mockResolvedValue({});
  (useSetOnboardingRole as jest.Mock).mockReturnValue({
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
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole();
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    const participant = screen.getByRole("button", { name: "Participant" });
    const guide = screen.getByRole("button", { name: "Guide" });

    expect(participant).toHaveAttribute("aria-pressed", "true");
    // SegmentedControl doesn't disable the active option (clicking it is a no-op — see below).
    expect(participant).toBeEnabled();
    expect(guide).toHaveAttribute("aria-pressed", "false");
    expect(guide).toBeEnabled();
    expect(screen.getByRole("group", { name: "Active role" })).toBeInTheDocument();
  });

  it("clicking Guide calls setActiveRole.mutateAsync('GUIDE')", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    const mutateAsync = setupSetActiveRole();
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith("GUIDE");
  });

  it("invokes onNavigate after a successful switch", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole();
    setupSetOnboardingRole();
    const onNavigate = jest.fn();

    render(<RoleSwitcher onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("when activeRole=GUIDE, the Guide side is active (pressed)", () => {
    setupMe({
      activeRole: "GUIDE",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole();
    setupSetOnboardingRole();

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
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    const mutateAsync = setupSetActiveRole();
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    // Active button is disabled; userEvent respects pointer-events/disabled.
    await userEvent.click(screen.getByRole("button", { name: "Participant" }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces an error Alert when the switch rejects", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole({
      mutateAsync: jest.fn().mockRejectedValue(new Error("403")),
    });
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(await screen.findByText(/couldn.t switch right now/i)).toBeInTheDocument();
  });

  it("attributes a dismissed sign-in prompt to auth, not to the switch failing", async () => {
    // N1a Symptom A′: the role switch never ran, so "couldn't switch right now, please try
    // again" would send the user retrying an action that was never the problem.
    setupMe({ activeRole: "PARTICIPANT", roles: ["PARTICIPANT", "GUIDE"] });
    setupSetActiveRole({
      mutateAsync: jest.fn().mockRejectedValue(new AuthCancelledError()),
    });
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t switch right now/i)).not.toBeInTheDocument();
  });

  it("disables both toggle buttons while a switch is pending", () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole({ isPending: true });
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    expect(screen.getByRole("button", { name: "Participant" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guide" })).toBeDisabled();
  });
});

describe("RoleSwitcher — holds ONE role (become the other, in-app)", () => {
  it("GUIDE only → 'Become a Participant' calls onboarding-role and navigates to /onboarding/participant (no /auth/login)", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    const mutateAsync = setupSetOnboardingRole();
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    const btn = screen.getByRole("button", { name: /become a participant/i });
    await userEvent.click(btn);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith("PARTICIPANT");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/onboarding/participant");
  });

  it("PARTICIPANT only (not parent) → 'Become a Guide' calls onboarding-role and navigates to /onboarding/guide (no /auth/login)", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile("STUDENT");
    setupSetActiveRole();
    const mutateAsync = setupSetOnboardingRole();
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    const btn = screen.getByRole("button", { name: /become a guide/i });
    await userEvent.click(btn);

    expect(mutateAsync).toHaveBeenCalledWith("GUIDE");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/onboarding/guide");
  });

  it("never round-trips through /auth/login for the become-X path", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole();
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(navigate).toHaveBeenCalledTimes(1);
    const url = navigate.mock.calls[0][0] as string;
    expect(url).not.toContain("/auth/login");
  });

  it("calls onNavigate before navigating", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole();
    const onNavigate = jest.fn();
    const navigate = jest.fn();

    render(<RoleSwitcher onNavigate={onNavigate} navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("without a navigate prop, falls back to window.location.assign with the onboarding path", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole();
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

  it("403 (not eligible) → shows a not-eligible message and does not navigate", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    // Defensive case: the button is normally hidden for a PARENT, but eligibility could have
    // changed server-side mid-session — the 403 must still be handled gracefully.
    setupParticipantProfile("STUDENT");
    setupSetActiveRole();
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(403, "not eligible")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a guide/i }));

    expect(await screen.findByText(/can.t become guides/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("403 (not eligible) for the PARTICIPANT target → shows the generic not-eligible message", async () => {
    // Defensive/unreached-in-practice branch: today only PARENT→GUIDE is gated, but the
    // become-PARTICIPANT path must still degrade gracefully if the bff ever 403s it too.
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(403, "not eligible")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(
      await screen.findByText(/you.re not eligible to become a participant right now/i),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("409 (already held) falls back to setActiveRole then navigates to /dashboard", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    const switchMutateAsync = setupSetActiveRole();
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(409, "already held")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(switchMutateAsync).toHaveBeenCalledTimes(1);
    expect(switchMutateAsync).toHaveBeenCalledWith("PARTICIPANT");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("409 fallback switch itself rejecting → surfaces the switch-failed message, no navigation", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole({
      mutateAsync: jest.fn().mockRejectedValue(new Error("boom")),
    });
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(409, "already held")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(await screen.findByText(/couldn.t switch right now/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("409 fallback switch rejecting with a cancelled sign-in → attributes it to auth", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole({
      mutateAsync: jest.fn().mockRejectedValue(new AuthCancelledError()),
    });
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(409, "already held")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a dismissed sign-in prompt on the onboarding call itself is attributed to auth", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new AuthCancelledError()),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("network/5xx error on the onboarding call → generic retry message, no navigation", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole({
      mutateAsync: jest.fn().mockRejectedValue(new Error("network down")),
    });
    const navigate = jest.fn();

    render(<RoleSwitcher navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(await screen.findByText(/couldn.t start onboarding right now/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("disables the become button while onboarding-role is pending", () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    setupSetOnboardingRole({ isPending: true });

    render(<RoleSwitcher />);

    expect(screen.getByRole("button", { name: /become a participant/i })).toBeDisabled();
  });

  it("disables the become button while the 409 fallback switch is pending", () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole({ isPending: true });
    setupSetOnboardingRole();

    render(<RoleSwitcher />);

    expect(screen.getByRole("button", { name: /become a participant/i })).toBeDisabled();
  });
});

describe("RoleSwitcher — renders nothing", () => {
  it("PARTICIPANT only + type=PARENT → empty (can't become a guide)", () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile("PARENT");
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("PARTICIPANT only, participant profile still loading → empty (hold off until known)", () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT"],
    });
    setupParticipantProfile(null, { isLoading: true });
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=null → empty", () => {
    setupMe({ activeRole: null, roles: [] });
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=ADMIN → empty", () => {
    setupMe({ activeRole: "ADMIN", roles: ["ADMIN"] });
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=SUPPORT → empty", () => {
    setupMe({ activeRole: "SUPPORT", roles: ["SUPPORT"] });
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("me=null → empty", () => {
    setupMe(null);
    setupSetActiveRole();
    setupSetOnboardingRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
