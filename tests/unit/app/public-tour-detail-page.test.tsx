import { render, screen } from "@testing-library/react";

jest.mock("@/components/tours/TourDetailPage", () => ({
  TourDetailPage: ({ tourId }: { tourId: string }) => <div data-testid="tour-detail">{tourId}</div>,
}));

import PublicTourDetailRoutePage from "@/app/(public)/tours/[tourId]/page";

it("passes the URL id to the public tour detail component", async () => {
  render(await PublicTourDetailRoutePage({ params: Promise.resolve({ tourId: "tour-1" }) }));
  expect(screen.getByTestId("tour-detail")).toHaveTextContent("tour-1");
});
