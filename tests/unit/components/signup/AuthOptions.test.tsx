import { fireEvent, render, screen } from "@testing-library/react";
import { AuthOptions } from "@/components/signup/AuthOptions";

describe("AuthOptions", () => {
  it("offers the Google sign-in path", () => {
    render(<AuthOptions />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("does not collect a password or email itself", () => {
    render(<AuthOptions />);
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  describe("clicking Continue with Google", () => {
    let navigate: jest.Mock;

    it("redirects to the BFF /auth/login with returnTo + intent", () => {
      navigate = jest.fn();
      render(<AuthOptions intent="signup" returnTo="/onboarding/guide" navigate={navigate} />);
      fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
      expect(navigate).toHaveBeenCalledTimes(1);
      const url = navigate.mock.calls[0][0] as string;
      expect(url).toContain("/auth/login?");
      expect(url).toContain("intent=signup");
      expect(url).toContain(encodeURIComponent("/onboarding/guide"));
    });

    it("defaults to a signin intent and the dashboard return", () => {
      navigate = jest.fn();
      render(<AuthOptions navigate={navigate} />);
      fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
      expect(navigate).toHaveBeenCalledTimes(1);
      const url = navigate.mock.calls[0][0] as string;
      expect(url).toContain("intent=signin");
      expect(url).toContain(encodeURIComponent("/dashboard"));
    });

    it("without a navigate prop, falls back to window.location.assign", () => {
      const assign = jest.fn();
      const original = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...original, assign },
      });

      try {
        render(<AuthOptions />);
        fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

        expect(assign).toHaveBeenCalledTimes(1);
        const url = assign.mock.calls[0][0] as string;
        expect(url).toContain("/auth/login?");
        expect(url).toContain("intent=signin");
        expect(url).toContain(encodeURIComponent("/dashboard"));
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: original,
        });
      }
    });
  });
});
