import { render, screen } from "@testing-library/react";

jest.mock("@/components/tours/TourDetailPage", () => ({
  TourDetailPage: ({ tourRef }: { tourRef: string }) => (
    <div data-testid="tour-detail">{tourRef}</div>
  ),
}));

import TourDetailRoute, { metadata } from "@/app/(public)/tours/[tourRef]/page";

describe("tour detail route", () => {
  it("passes the route ref into the client detail page", async () => {
    const ui = await TourDetailRoute({ params: Promise.resolve({ tourRef: "tour-id-campus" }) });
    render(ui);

    expect(screen.getByTestId("tour-detail")).toHaveTextContent("tour-id-campus");
  });

  it("exports booking-oriented metadata", () => {
    expect(metadata.title).toBe("Tour detail — CampusToursLive.ai");
    expect(metadata.description).toContain("local timezone");
  });
});
