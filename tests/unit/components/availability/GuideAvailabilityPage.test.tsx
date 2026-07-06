import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideAvailabilityPage } from "@/components/availability/GuideAvailabilityPage";
import {
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useGuideAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
} from "@/lib/data-access";
import type { AvailabilitySummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useGuideAvailability: jest.fn(),
  useCreateAvailabilityRule: jest.fn(),
  useUpdateAvailabilityRule: jest.fn(),
  useDeleteAvailabilityRule: jest.fn(),
  useCreateAvailabilityException: jest.fn(),
  useUpdateAvailabilityException: jest.fn(),
  useDeleteAvailabilityException: jest.fn(),
  useUpdateBookingSettings: jest.fn(),
}));

const mockUseGuideAvailability = useGuideAvailability as jest.Mock;
const noopMutation = () => ({ mutateAsync: jest.fn(), isPending: false });

const sampleSummary: AvailabilitySummary = {
  rules: [
    {
      id: "r1",
      dayOfWeek: 1,
      startLocal: "10:00",
      endLocal: "13:00",
      timezone: "America/Los_Angeles",
      effectiveFrom: "2026-06-01",
      effectiveTo: null,
      active: true,
      createdAt: null,
    },
  ],
  exceptions: [
    {
      id: "e1",
      exceptionDate: "2026-07-04",
      type: "UNAVAILABLE_ALL_DAY",
      startLocal: null,
      endLocal: null,
      reason: "Holiday",
      createdAt: null,
    },
  ],
  bookingSettings: {
    acceptanceMode: "MANUAL",
    responseDeadlineMin: 90,
    minNoticeMin: 1440,
    maxAdvanceDays: 30,
    bufferBeforeMin: 0,
    bufferAfterMin: 15,
    durationsOffered: [60],
    timezone: "America/Los_Angeles",
  },
};

beforeEach(() => {
  mockUseGuideAvailability.mockReturnValue({
    data: sampleSummary,
    isLoading: false,
    isError: false,
  });
  (useCreateAvailabilityRule as jest.Mock).mockImplementation(noopMutation);
  (useUpdateAvailabilityRule as jest.Mock).mockImplementation(noopMutation);
  (useDeleteAvailabilityRule as jest.Mock).mockImplementation(noopMutation);
  (useCreateAvailabilityException as jest.Mock).mockImplementation(noopMutation);
  (useUpdateAvailabilityException as jest.Mock).mockImplementation(noopMutation);
  (useDeleteAvailabilityException as jest.Mock).mockImplementation(noopMutation);
});

describe("GuideAvailabilityPage", () => {
  it("renders recurring rules, exceptions, and booking rules", () => {
    render(<GuideAvailabilityPage />);

    expect(screen.getByRole("heading", { name: "Schedules" })).toBeInTheDocument();
    expect(screen.getByText("Weekly hours")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("10:00am – 1:00pm")).toBeInTheDocument();
    expect(screen.getByText("Date-specific hours")).toBeInTheDocument();
    expect(screen.getByText("Holiday")).toBeInTheDocument();
    expect(screen.getByText("1d")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("shows loading state", () => {
    mockUseGuideAvailability.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<GuideAvailabilityPage />);
    expect(screen.getByText(/Loading availability/i)).toBeInTheDocument();
  });

  it("shows error state when the query fails", () => {
    mockUseGuideAvailability.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<GuideAvailabilityPage />);
    expect(screen.getByText(/Failed to load your availability/i)).toBeInTheDocument();
  });

  it("creates a recurring rule from the modal", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    (useCreateAvailabilityRule as jest.Mock).mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Add hours on Tuesday" }));
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfWeek: 2,
          startLocal: "09:00",
          endLocal: "22:00",
        }),
      ),
    );
  });

  it("deletes a rule after confirmation", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    (useDeleteAvailabilityRule as jest.Mock).mockReturnValue({
      mutateAsync,
      isPending: false,
      variables: null,
    });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Remove hours" }));

    expect(mutateAsync).toHaveBeenCalledWith("r1");
  });
});
