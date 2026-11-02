import { render, screen } from "@testing-library/react";

jest.mock("@/components/site/SiteHeader", () => ({ SiteHeader: () => null }));
jest.mock("@/components/tours/TourDetailRoute", () => ({
  TourDetailRoute: ({ tourId }: { tourId: string }) => (
    <div data-testid="tour-detail">{tourId}</div>
  ),
}));

import PublicTourDetailRoutePage from "@/app/tours/[tourId]/page";

it("passes the URL id to the public tour detail component", async () => {
  render(await PublicTourDetailRoutePage({ params: Promise.resolve({ tourId: "tour-1" }) }));
  expect(screen.getByTestId("tour-detail")).toHaveTextContent("tour-1");
});
