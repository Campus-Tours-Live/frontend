import { render, screen } from "@testing-library/react";

// Stub the heavy client subtrees so these thin server-component shells render in
// isolation (the children have their own tests).
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
jest.mock("@/components/home/Hero", () => ({ Hero: () => <div data-testid="hero" /> }));
jest.mock("@/components/home/FeaturedTours", () => ({
  FeaturedTours: () => <div data-testid="featured" />,
}));
jest.mock("@/components/tours/AllToursPage", () => ({
  AllToursPage: () => <div data-testid="all-tours-page" />,
}));
jest.mock("@/components/signup/GuideOnboardingForm", () => ({
  GuideOnboardingForm: () => <div data-testid="guide-form" />,
}));
jest.mock("@/components/signup/ParticipantOnboardingForm", () => ({
  ParticipantOnboardingForm: () => <div data-testid="participant-form" />,
}));
jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(() => ({ me: { activeRole: "PARTICIPANT" }, isLoading: false })),
}));
jest.mock("@/components/profile/GuideProfilePage", () => ({
  GuideProfilePage: () => <div data-testid="guide-profile-page" />,
}));

import HomePage from "@/app/page";
import ToursPage from "@/app/tours/page";
import ProfilePage from "@/app/(app)/profile/page";
import SupportPage from "@/app/(app)/support/page";
import StaffPage from "@/app/staff/page";
import GuideOnboardingPage from "@/app/onboarding/guide/page";
import ParticipantOnboardingPage from "@/app/onboarding/participant/page";
import { useMe } from "@/lib/data-access";

const mockUseMe = useMe as jest.Mock;

describe("static / shell pages", () => {
  it("home renders header + hero + featured tours", () => {
    render(<HomePage />);
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("tours page renders header + all tours content", () => {
    render(<ToursPage />);
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("all-tours-page")).toBeInTheDocument();
  });

  it("profile placeholder shows its heading", () => {
    mockUseMe.mockReturnValue({ me: { activeRole: "PARTICIPANT" }, isLoading: false });
    render(<ProfilePage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("profile shows loading before role branch resolves", () => {
    mockUseMe.mockReturnValue({ me: null, isLoading: true });
    render(<ProfilePage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("profile renders guide page when active role is GUIDE", () => {
    mockUseMe.mockReturnValue({ me: { activeRole: "GUIDE" }, isLoading: false });
    render(<ProfilePage />);
    expect(screen.getByTestId("guide-profile-page")).toBeInTheDocument();
  });

  it("support placeholder shows its heading", () => {
    render(<SupportPage />);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("staff placeholder shows the coming-soon notice", () => {
    render(<StaffPage />);
    expect(screen.getByText(/staff area/i)).toBeInTheDocument();
  });

  it("guide onboarding shell mounts the form", () => {
    render(<GuideOnboardingPage />);
    expect(screen.getByTestId("guide-form")).toBeInTheDocument();
  });

  it("participant onboarding shell mounts the form", () => {
    render(<ParticipantOnboardingPage />);
    expect(screen.getByTestId("participant-form")).toBeInTheDocument();
  });
});
