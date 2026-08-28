import { render, screen } from "@testing-library/react";
import { TourHistoryPage } from "@/components/dashboard/TourHistoryPage";
import { useBookingHistory } from "@/lib/data-access";
import type { BookingResponse } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useBookingHistory: jest.fn(),
}));

const mockUseBookingHistory = useBookingHistory as jest.Mock;

const completedBooking: BookingResponse = {
  id: "bk_1",
  status: "COMPLETED",
  scheduledStartAt: "2026-05-18T14:00:00Z",
  scheduledEndAt: "2026-05-18T15:00:00Z",
  durationMinutes: 60,
  tourOfferingId: "off_1",
  tourTitle: "Campus life and hidden study spots",
  guideName: "Maya Chen",
  guideResponseDeadline: null,
  universityName: "North Coast University",
  price: { amount: 4200, currency: "USD" },
};

describe("TourHistoryPage", () => {
  it("shows a loading indicator while fetching", () => {
    mockUseBookingHistory.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<TourHistoryPage />);
    expect(screen.getByText("Loading your tour history…")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", () => {
    mockUseBookingHistory.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      data: undefined,
    });
    render(<TourHistoryPage />);
    expect(screen.getByText("Failed to load your tour history")).toBeInTheDocument();
  });

  it("shows an empty state when there are no past tours", () => {
    mockUseBookingHistory.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<TourHistoryPage />);
    expect(screen.getByText("No completed tours yet.")).toBeInTheDocument();
  });

  it("renders completed tour cards with title, university, date, and guide", () => {
    mockUseBookingHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [completedBooking],
    });
    render(<TourHistoryPage />);
    expect(screen.getByText("Campus life and hidden study spots")).toBeInTheDocument();
    expect(screen.getByText(/North Coast University/)).toBeInTheDocument();
    expect(screen.getByText(/Maya Chen/)).toBeInTheDocument();
    expect(screen.getByText(/May 18/)).toBeInTheDocument();
  });

  it("renders the COMPLETED status badge", () => {
    mockUseBookingHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [completedBooking],
    });
    render(<TourHistoryPage />);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  it("renders View Summary and Leave Review action buttons", () => {
    mockUseBookingHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [completedBooking],
    });
    render(<TourHistoryPage />);
    expect(screen.getByRole("button", { name: "View Summary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave Review" })).toBeInTheDocument();
  });

  it("renders the page heading and subtitle", () => {
    mockUseBookingHistory.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<TourHistoryPage />);
    expect(screen.getByRole("heading", { name: "My Tours" })).toBeInTheDocument();
    expect(
      screen.getByText("Completed tours, summaries, recordings when available, and reviews."),
    ).toBeInTheDocument();
  });
});
