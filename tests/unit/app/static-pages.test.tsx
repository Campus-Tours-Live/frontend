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
  useMe: jest.fn(() => ({ me: { currentRole: "PARTICIPANT" }, isLoading: false })),
}));
jest.mock("@/components/profile/GuideProfilePage", () => ({
  GuideProfilePage: () => <div data-testid="guide-profile-page" />,
}));

import HomePage from "@/app/(public)/page";
import ToursPage, { metadata as toursMetadata } from "@/app/(public)/tours/page";
import PublicLayout from "@/app/(public)/layout";
import AuthLayout from "@/app/(auth)/layout";
import ProfilePage from "@/app/(app)/profile/page";
import SupportPage from "@/app/(app)/support/page";
import StaffPage from "@/app/staff/page";
import GuideOnboardingPage from "@/app/(auth)/onboarding/guide/page";
import ParticipantOnboardingPage from "@/app/(auth)/onboarding/participant/page";
import { useMe } from "@/lib/data-access";

const mockUseMe = useMe as jest.Mock;

describe("static / shell pages", () => {
  // The header now lives on the (public) layout, not the pages themselves.
  it("home renders hero + featured tours (no header of its own)", () => {
    render(<HomePage />);
    expect(screen.queryByTestId("site-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("tours page renders all tours content (no header of its own)", () => {
    render(<ToursPage />);
    expect(screen.queryByTestId("site-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("all-tours-page")).toBeInTheDocument();
  });

  it("tours page exports discovery-oriented metadata", () => {
    expect(toursMetadata.title).toBe("Explore tours — CampusToursLive.ai");
    expect(toursMetadata.description).toContain("campus tours");
  });

  it("(public) layout wraps children with the site header", () => {
    render(<PublicLayout>{<div data-testid="child" />}</PublicLayout>);
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("(auth) layout renders its children with no header (focused funnel)", () => {
    render(<AuthLayout>{<div data-testid="child" />}</AuthLayout>);
    expect(screen.queryByTestId("site-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("profile placeholder shows its heading", () => {
    mockUseMe.mockReturnValue({ me: { currentRole: "PARTICIPANT" }, isLoading: false });
    render(<ProfilePage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("profile shows loading before role branch resolves", () => {
    mockUseMe.mockReturnValue({ me: null, isLoading: true });
    render(<ProfilePage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("profile explains an unverifiable session instead of spinning forever", () => {
    // The reason sessionUnverified is its own state and not folded into isLoading: this page
    // renders a spinner for isLoading, and during a sustained outage that spinner would
    // never resolve — there is no polling loop and nothing to wait for. An indefinite
    // spinner is a worse lie than saying what happened.
    mockUseMe.mockReturnValue({ me: null, isLoading: false, sessionUnverified: true });
    render(<ProfilePage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t be verified/i);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    // And it must not claim they are signed out.
    expect(screen.getByRole("alert")).toHaveTextContent(/still signed in/i);
  });

  it("profile renders guide page when active role is GUIDE", () => {
    mockUseMe.mockReturnValue({ me: { currentRole: "GUIDE" }, isLoading: false });
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
