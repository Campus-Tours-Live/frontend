import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideNextTour } from "@/components/dashboard/GuideNextTour";
import { useGuideNextTour } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({ useGuideNextTour: jest.fn() }));
const useNext = jest.mocked(useGuideNextTour);
const refetch = jest.fn();
function setQuery(overrides = {}) {
  useNext.mockReturnValue({
    data: null,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch,
    ...overrides,
  } as unknown as ReturnType<typeof useGuideNextTour>);
}
beforeEach(() => {
  jest.clearAllMocks();
  setQuery();
});

it("shows a loading state without an empty message", () => {
  setQuery({ isPending: true });
  render(<GuideNextTour />);
  expect(screen.getByText("Loading your next tour…")).toBeInTheDocument();
  expect(screen.queryByText("No upcoming confirmed tours.")).not.toBeInTheDocument();
});

it("shows an empty schedule and a link to all upcoming tours", () => {
  render(<GuideNextTour />);
  expect(screen.getByRole("heading", { name: "Next upcoming tour" })).toBeInTheDocument();
  expect(screen.getByText("No upcoming confirmed tours.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View all upcoming tours" })).toHaveAttribute(
    "href",
    "/guide/bookings?filter=upcoming",
  );
});

it("shows booking information and timezone with a detail link", () => {
  setQuery({
    data: {
      id: "booking-1",
      offeringTitle: "Campus walk",
      participantName: "Sam",
      universityName: "State University",
      scheduledAt: "2026-10-03T17:00:00Z",
      durationMin: 45,
    },
  });
  render(<GuideNextTour />);
  expect(screen.getByRole("heading", { name: "Campus walk" })).toBeInTheDocument();
  expect(screen.getByText("Sam · State University")).toBeInTheDocument();
  expect(screen.getByText(/45 min/)).toBeInTheDocument();
  expect(
    screen.getByText(`Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View booking" })).toHaveAttribute(
    "href",
    "/guide/bookings/booking-1?returnFilter=upcoming",
  );
  expect(screen.queryByRole("button", { name: /join/i })).not.toBeInTheDocument();
});

it("supports a missing university name", () => {
  setQuery({
    data: {
      id: "b1",
      offeringTitle: "Campus walk",
      participantName: "Sam",
      scheduledAt: "2026-10-03T17:00:00Z",
      durationMin: 45,
    },
  });
  render(<GuideNextTour />);
  expect(screen.getByText("Sam")).toBeInTheDocument();
});

it("hides stale bookings on failure and offers retry", async () => {
  setQuery({ isError: true, error: new Error("offline"), data: { offeringTitle: "Stale tour" } });
  render(<GuideNextTour />);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load your next tour.");
  expect(screen.queryByText("Stale tour")).not.toBeInTheDocument();
  expect(screen.queryByText("No upcoming confirmed tours.")).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("disables retry while a retry is in progress", () => {
  setQuery({ isError: true, isFetching: true });
  render(<GuideNextTour />);
  expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();
});
