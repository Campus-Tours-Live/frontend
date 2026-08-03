import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ViewerLocalBookingTimeRange } from "@/components/booking/ViewerLocalBookingTimeRange";
import * as bookingTime from "@/lib/bookingTime";

jest.mock("@/lib/bookingTime", () => {
  const actual = jest.requireActual("@/lib/bookingTime");
  return {
    ...actual,
    getViewerTimeZone: jest.fn(),
  };
});

const start = "2026-07-10T15:00:00Z";
const end = "2026-07-10T16:00:00Z";
const mockGetViewerTimeZone = bookingTime.getViewerTimeZone as jest.MockedFunction<
  typeof bookingTime.getViewerTimeZone
>;

afterEach(() => {
  jest.clearAllMocks();
});

describe("ViewerLocalBookingTimeRange", () => {
  it("renders a stable placeholder before the browser timezone is known", () => {
    mockGetViewerTimeZone.mockReturnValue(null);

    render(<ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />);

    const time = screen.getByText(bookingTime.BOOKING_TIME_PLACEHOLDER);
    expect(time).toHaveAttribute("datetime", start);
  });

  it("formats in the viewer timezone after mount", async () => {
    mockGetViewerTimeZone.mockReturnValue("America/Chicago");

    render(<ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />);

    expect(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).toBeInTheDocument();
  });

  it("refreshes when the browser timezone changes while the page is open", async () => {
    let timeZone = "America/Chicago";
    mockGetViewerTimeZone.mockImplementation(() => timeZone);

    render(<ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />);

    expect(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).toBeInTheDocument();

    timeZone = "America/Los_Angeles";
    fireEvent.focus(window);

    await waitFor(() =>
      expect(screen.getByText("Fri, 7/10 · 8:00 AM – 9:00 AM PDT")).toBeInTheDocument(),
    );
  });
});
