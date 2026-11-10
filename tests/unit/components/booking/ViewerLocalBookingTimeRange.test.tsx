import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server.node";
import {
  ViewerLocalBookingTimeRange,
  ViewerLocalTimeZoneLabel,
} from "@/components/booking/ViewerLocalBookingTimeRange";
import * as bookingTime from "@/lib/bookingTime";

jest.mock("@/lib/bookingTime", () => {
  const actual = jest.requireActual("@/lib/bookingTime");
  return { ...actual, getViewerTimeZone: jest.fn() };
});

const start = "2026-07-10T15:00:00Z";
const end = "2026-07-10T16:00:00Z";
const mockGetViewerTimeZone = bookingTime.getViewerTimeZone as jest.MockedFunction<
  typeof bookingTime.getViewerTimeZone
>;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("ViewerLocalBookingTimeRange", () => {
  it("server-renders stable placeholders to avoid hydration mismatches", () => {
    mockGetViewerTimeZone.mockReturnValue("America/Chicago");

    const html = renderToString(
      <>
        <ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />
        <ViewerLocalTimeZoneLabel />
      </>,
    );

    expect(html).toContain(bookingTime.BOOKING_TIME_PLACEHOLDER);
    expect(html).not.toContain("America/Chicago");
  });

  it("formats the booking range and timezone label after mount", async () => {
    mockGetViewerTimeZone.mockReturnValue("America/Chicago");

    render(
      <>
        <ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />
        <ViewerLocalTimeZoneLabel />
      </>,
    );

    expect(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).toHaveAttribute(
      "datetime",
      start,
    );
    expect(screen.getByText("America/Chicago")).toBeInTheDocument();
  });

  it("refreshes when browser focus returns after a timezone change", async () => {
    let timeZone = "America/Chicago";
    mockGetViewerTimeZone.mockImplementation(() => timeZone);

    render(
      <>
        <ViewerLocalBookingTimeRange scheduledStartAt={start} scheduledEndAt={end} />
        <ViewerLocalTimeZoneLabel />
      </>,
    );

    expect(await screen.findByText("America/Chicago")).toBeInTheDocument();
    timeZone = "America/Los_Angeles";
    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.getByText("Fri, 7/10 · 8:00 AM – 9:00 AM PDT")).toBeInTheDocument();
      expect(screen.getByText("America/Los_Angeles")).toBeInTheDocument();
    });
  });
});
