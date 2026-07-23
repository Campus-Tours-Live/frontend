import { render, screen } from "@testing-library/react";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import userEvent from "@testing-library/user-event";
import { RoleSwitcher } from "@/components/site/RoleSwitcher";
import { useMe, useSetActiveRole } from "@/lib/data-access";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(),
  useSetActiveRole: jest.fn(),
}));

type MePartial = {
  activeRole?: string | null;
  participantType?: string | null;
  roles?: string[];
};

function setupMe(me: MePartial | null) {
  const roles = me?.roles ?? [];
  (useMe as jest.Mock).mockReturnValue({
    me,
    hasRole: (r: string) => roles.includes(r),
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RoleSwitcher — holds BOTH roles (segmented toggle)", () => {
  it("renders a Participant/Guide toggle with the active side pressed", () => {
    setupMe({
      activeRole: "PARTICIPANT",
      roles: ["PARTICIPANT", "GUIDE"],
    });
    setupSetActiveRole();

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

    render(<RoleSwitcher />);

    expect(screen.getByRole("button", { name: "Participant" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guide" })).toBeDisabled();
  });
});

describe("RoleSwitcher — holds ONE role (become the other)", () => {
  it("GUIDE only → 'Become a Participant' navigates to participant onboarding", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();

    render(<RoleSwitcher />);

    const btn = screen.getByRole("button", { name: /become a participant/i });
    await userEvent.click(btn);

    expect(push).toHaveBeenCalledWith("/onboarding/participant");
  });

  it("PARTICIPANT only (not parent) → 'Become a Guide' navigates to guide onboarding", async () => {
    setupMe({
      activeRole: "PARTICIPANT",
      participantType: "STUDENT",
      roles: ["PARTICIPANT"],
    });
    setupSetActiveRole();

    render(<RoleSwitcher />);

    const btn = screen.getByRole("button", { name: /become a guide/i });
    await userEvent.click(btn);

    expect(push).toHaveBeenCalledWith("/onboarding/guide");
  });

  it("calls onNavigate before navigating", async () => {
    setupMe({ activeRole: "GUIDE", roles: ["GUIDE"] });
    setupSetActiveRole();
    const onNavigate = jest.fn();

    render(<RoleSwitcher onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: /become a participant/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe("RoleSwitcher — renders nothing", () => {
  it("PARTICIPANT only + participantType=PARENT → empty (can't become a guide)", () => {
    setupMe({
      activeRole: "PARTICIPANT",
      participantType: "PARENT",
      roles: ["PARTICIPANT"],
    });
    setupSetActiveRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=null → empty", () => {
    setupMe({ activeRole: null, roles: [] });
    setupSetActiveRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=ADMIN → empty", () => {
    setupMe({ activeRole: "ADMIN", roles: ["ADMIN"] });
    setupSetActiveRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("activeRole=SUPPORT → empty", () => {
    setupMe({ activeRole: "SUPPORT", roles: ["SUPPORT"] });
    setupSetActiveRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("me=null → empty", () => {
    setupMe(null);
    setupSetActiveRole();

    const { container } = render(<RoleSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
