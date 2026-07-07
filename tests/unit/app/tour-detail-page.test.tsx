import { render, screen } from "@testing-library/react";

jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
jest.mock("@/components/tours/TourDetailRoute", () => ({
  TourDetailRoute: ({ tourId }: { tourId: string }) => (
    <div data-testid="tour-detail" data-tour-id={tourId} />
  ),
}));

import TourDetailPage from "@/app/tours/[tourId]/page";

describe("/tours/[tourId] page", () => {
  it("passes the dynamic UUID to the API-backed detail route", async () => {
    const element = await TourDetailPage({
      params: Promise.resolve({ tourId: "a0000000-0000-4000-8000-000000000001" }),
    });
    render(element);

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("tour-detail")).toHaveAttribute(
      "data-tour-id",
      "a0000000-0000-4000-8000-000000000001",
    );
  });
});
