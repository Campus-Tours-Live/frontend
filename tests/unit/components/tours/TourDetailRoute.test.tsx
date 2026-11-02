import { render, screen } from "@testing-library/react";

const mockUseTourDetail = jest.fn();
jest.mock("@/lib/data-access", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super(`HTTP ${status}`);
    }
  },
  useTourDetail: (tourId: string) => mockUseTourDetail(tourId),
}));
jest.mock("@/components/tours/TourDetail", () => ({
  TourDetail: ({ tour }: { tour: { title: string } }) => (
    <div data-testid="detail">{tour.title}</div>
  ),
}));

import { ApiError } from "@/lib/data-access";
import { TourDetailRoute } from "@/components/tours/TourDetailRoute";

describe("TourDetailRoute", () => {
  it("shows a loading state", () => {
    mockUseTourDetail.mockReturnValue({ isLoading: true });
    render(<TourDetailRoute tourId="tour-id" />);
    expect(screen.getByText(/loading tour details/i)).toBeInTheDocument();
  });

  it("renders API data", () => {
    mockUseTourDetail.mockReturnValue({ data: { title: "Campus walk" }, isLoading: false });
    render(<TourDetailRoute tourId="tour-id" />);
    expect(screen.getByTestId("detail")).toHaveTextContent("Campus walk");
  });

  it.each([
    [401, /please sign in/i],
    [404, /no longer available/i],
    [500, /could not be loaded/i],
  ])("renders the %s API error state", (status, message) => {
    mockUseTourDetail.mockReturnValue({ isLoading: false, error: new ApiError(status) });
    render(<TourDetailRoute tourId="tour-id" />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
