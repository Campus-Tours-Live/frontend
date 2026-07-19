import { render, screen } from "@testing-library/react";

// Thin App Router route shells: each just mounts its heavy client component
// (which has its own tests). Stub those so the shells render in isolation.
jest.mock("@/components/availability/GuideAvailabilityPage", () => ({
  GuideAvailabilityPage: () => <div data-testid="guide-availability-page" />,
}));
jest.mock("@/components/offerings/TourOfferingsPage", () => ({
  TourOfferingsPage: () => <div data-testid="tour-offerings-page" />,
}));
jest.mock("@/components/offerings/CreateOfferingForm", () => ({
  CreateOfferingForm: () => <div data-testid="create-offering-form" />,
}));

import GuideAvailabilityRoutePage from "@/app/(app)/guide/availability/page";
import GuideTourOfferingsPage from "@/app/(app)/guide/tour-offerings/page";
import NewTourOfferingPage from "@/app/(app)/guide/tour-offerings/new/page";

describe("guide route shells", () => {
  it("availability route mounts the availability page", () => {
    render(<GuideAvailabilityRoutePage />);
    expect(screen.getByTestId("guide-availability-page")).toBeInTheDocument();
  });

  it("tour-offerings route mounts the offerings page", () => {
    render(<GuideTourOfferingsPage />);
    expect(screen.getByTestId("tour-offerings-page")).toBeInTheDocument();
  });

  it("new tour-offering route mounts the create-offering form", () => {
    render(<NewTourOfferingPage />);
    expect(screen.getByTestId("create-offering-form")).toBeInTheDocument();
  });
});
