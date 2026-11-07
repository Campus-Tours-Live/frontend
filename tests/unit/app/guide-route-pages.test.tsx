import { render, screen } from "@testing-library/react";

// Thin App Router route shells: each just mounts its heavy client component
// (which has its own tests). Stub those so the shells render in isolation.
jest.mock("@/components/availability/GuideAvailabilityPage", () => ({
  GuideAvailabilityPage: () => <div data-testid="guide-availability-page" />,
}));
jest.mock("@/components/offerings/TourOfferingsPage", () => ({
  TourOfferingsPage: () => <div data-testid="tour-offerings-page" />,
}));
jest.mock("@/components/earnings/GuideEarningsPage", () => ({
  GuideEarningsPage: () => <div data-testid="guide-earnings-page" />,
}));
jest.mock("@/components/offerings/CreateOfferingForm", () => ({
  CreateOfferingForm: () => <div data-testid="create-offering-form" />,
}));
jest.mock("@/components/offerings/EditOfferingPage", () => ({
  EditOfferingPage: ({ offeringId }: { offeringId: string }) => (
    <div data-testid="edit-offering-page">{offeringId}</div>
  ),
}));
jest.mock("@/components/bookings/GuideBookingsPage", () => ({
  GuideBookingsPage: () => <div data-testid="guide-bookings-page" />,
}));

import GuideAvailabilityRoutePage from "@/app/(app)/guide/availability/page";
import GuideEarningsRoutePage from "@/app/(app)/guide/earnings/page";
import GuideTourOfferingsPage from "@/app/(app)/guide/tour-offerings/page";
import NewTourOfferingPage from "@/app/(app)/guide/tour-offerings/new/page";
import EditTourOfferingRoutePage from "@/app/(app)/guide/tour-offerings/[offeringId]/edit/page";
import GuideBookingsRoutePage from "@/app/(app)/guide/bookings/page";

describe("guide route shells", () => {
  it("availability route mounts the availability page", () => {
    render(<GuideAvailabilityRoutePage />);
    expect(screen.getByTestId("guide-availability-page")).toBeInTheDocument();
  });

  it("tour-offerings route mounts the offerings page", () => {
    render(<GuideTourOfferingsPage />);
    expect(screen.getByTestId("tour-offerings-page")).toBeInTheDocument();
  });

  it("earnings route mounts the earnings page", () => {
    render(<GuideEarningsRoutePage />);
    expect(screen.getByTestId("guide-earnings-page")).toBeInTheDocument();
  });

  it("new tour-offering route mounts the create-offering form", () => {
    render(<NewTourOfferingPage />);
    expect(screen.getByTestId("create-offering-form")).toBeInTheDocument();
  });

  it("edit tour-offering route passes the URL offering id to the editor", async () => {
    render(await EditTourOfferingRoutePage({ params: Promise.resolve({ offeringId: "o1" }) }));
    expect(screen.getByTestId("edit-offering-page")).toHaveTextContent("o1");
  });

  it("bookings route mounts the bookings page", () => {
    render(<GuideBookingsRoutePage />);
    expect(screen.getByTestId("guide-bookings-page")).toBeInTheDocument();
  });
});
