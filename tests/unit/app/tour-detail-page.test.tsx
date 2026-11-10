import { render, screen } from "@testing-library/react";

jest.mock("@/components/tours/TourDetailPage", () => ({
  TourDetailPage: ({ tourRef }: { tourRef: string }) => (
    <div data-testid="tour-detail" data-tour-ref={tourRef} />
  ),
}));

import TourDetailPage, { metadata } from "@/app/(public)/tours/[tourRef]/page";

describe("/tours/[tourRef] page", () => {
  it("passes the dynamic public tour reference to the booking detail page", async () => {
    const element = await TourDetailPage({
      params: Promise.resolve({ tourRef: "a0000000-0000-4000-8000-000000000001-campus-life" }),
    });
    render(element);

    expect(screen.getByTestId("tour-detail")).toHaveAttribute(
      "data-tour-ref",
      "a0000000-0000-4000-8000-000000000001-campus-life",
    );
  });

  it("describes the viewer-local booking experience", () => {
    expect(metadata.title).toBe("Tour detail — CampusToursLive.ai");
  });
});
