import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingCancel } from "@/components/signup/OnboardingCancel";
import { useMe } from "@/lib/data-access";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/data-access", () => ({ useMe: jest.fn() }));

const mockMe = (isOnboarded: boolean) => (useMe as jest.Mock).mockReturnValue({ isOnboarded });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OnboardingCancel", () => {
  describe("pristine form (dirty=false)", () => {
    it("navigates immediately on Cancel without showing the discard dialog", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty={false} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(push).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Discard your progress?")).not.toBeInTheDocument();
    });

    it("navigates to /signup/role when not onboarded", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty={false} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(push).toHaveBeenCalledWith("/signup/role");
    });

    it("navigates to /dashboard when onboarded", async () => {
      mockMe(true);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty={false} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("dirty form (dirty=true)", () => {
    it("opens the discard confirmation dialog instead of navigating", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Discard your progress?")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("closes the dialog when the modal requests onClose (Escape)", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("'Keep editing' closes the dialog without navigating", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /keep editing/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Discard your progress?")).not.toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("'Discard' navigates to /signup/role when not onboarded", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /^discard$/i }));

      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/signup/role");
    });

    it("'Discard' navigates to /dashboard when onboarded", async () => {
      mockMe(true);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /^discard$/i }));

      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("disabled", () => {
    it("disables the Cancel button and does not navigate or open a dialog on click", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty={false} disabled />);

      const cancel = screen.getByRole("button", { name: /cancel/i });
      expect(cancel).toBeDisabled();

      await user.click(cancel);

      expect(push).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not open the discard dialog when disabled even if dirty", async () => {
      mockMe(false);
      const user = userEvent.setup();
      render(<OnboardingCancel dirty disabled />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });
  });
});
