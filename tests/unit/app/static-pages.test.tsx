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
jest.mock("@/components/signup/GuideOnboardingForm", () => ({
  GuideOnboardingForm: () => <div data-testid="guide-form" />,
}));
jest.mock("@/components/signup/ParticipantOnboardingForm", () => ({
  ParticipantOnboardingForm: () => <div data-testid="participant-form" />,
}));
jest.mock("@/lib/data-access", () => ({
  useMe: jest.fn(() => ({ me: { activeRole: "PARTICIPANT" } })),
}));
jest.mock("@/components/profile/GuideProfilePage", () => ({
  GuideProfilePage: () => <div data-testid="guide-profile-page" />,
}));

import HomePage from "@/app/page";
import ProfilePage from "@/app/(app)/profile/page";
import SupportPage from "@/app/(app)/support/page";
import StaffPage from "@/app/staff/page";
import GuideOnboardingPage from "@/app/onboarding/guide/page";
import ParticipantOnboardingPage from "@/app/onboarding/participant/page";

describe("static / shell pages", () => {
  it("home renders header + hero + featured tours", () => {
    render(<HomePage />);
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("profile placeholder shows its heading", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
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
