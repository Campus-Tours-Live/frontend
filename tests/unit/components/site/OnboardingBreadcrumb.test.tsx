import { render, screen } from "@testing-library/react";
import { OnboardingBreadcrumb } from "@/components/site/OnboardingBreadcrumb";
import { useMe } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({ useMe: jest.fn() }));

const mockMe = (isOnboarded: boolean) => (useMe as jest.Mock).mockReturnValue({ isOnboarded });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OnboardingBreadcrumb", () => {
  it("always renders Home as the first crumb linking to /", () => {
    mockMe(false);
    render(<OnboardingBreadcrumb current="Role" />);

    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/");
  });

  describe("when onboarded", () => {
    it("renders the middle crumb as a Dashboard link to /dashboard", () => {
      mockMe(true);
      render(<OnboardingBreadcrumb current="Role" />);

      const middle = screen.getByRole("link", { name: "Dashboard" });
      expect(middle).toHaveAttribute("href", "/dashboard");
      expect(screen.queryByRole("link", { name: "Sign up" })).not.toBeInTheDocument();
    });
  });

  describe("when not onboarded", () => {
    it("renders the middle crumb as a Sign up link to /signup/role", () => {
      mockMe(false);
      render(<OnboardingBreadcrumb current="Role" />);

      const middle = screen.getByRole("link", { name: "Sign up" });
      expect(middle).toHaveAttribute("href", "/signup/role");
      expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    });
  });

  describe("current label", () => {
    it("renders the current label as the last item and not as a link", () => {
      mockMe(false);
      render(<OnboardingBreadcrumb current="Role" />);

      expect(screen.queryByRole("link", { name: "Role" })).not.toBeInTheDocument();
      const current = screen.getByText("Role");
      expect(current.tagName).toBe("SPAN");
      expect(current).toHaveAttribute("aria-current", "page");
    });

    it("renders a different current value as the last, non-link item", () => {
      mockMe(true);
      render(<OnboardingBreadcrumb current="Profile" />);

      expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
      const current = screen.getByText("Profile");
      expect(current.tagName).toBe("SPAN");
      expect(current).toHaveAttribute("aria-current", "page");
    });
  });

  it("renders exactly three crumbs (Home, middle link, current)", () => {
    mockMe(false);
    render(<OnboardingBreadcrumb current="Role" />);

    // Home + Sign up are links; current is a non-link span.
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
});
