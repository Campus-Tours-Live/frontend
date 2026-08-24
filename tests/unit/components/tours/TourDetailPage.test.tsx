import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourDetailPage } from "@/components/tours/TourDetailPage";
import {
  useAddCartItem,
  useCreateBooking,
  useOfferingSlots,
  useTourDetail,
  type BookingResponse,
  type OfferingSlot,
  type TourDetail,
} from "@/lib/data-access";
import * as bookingTime from "@/lib/bookingTime";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useAddCartItem: jest.fn(),
  useCreateBooking: jest.fn(),
  useOfferingSlots: jest.fn(),
  useTourDetail: jest.fn(),
}));

jest.mock("@/lib/bookingTime", () => {
  const actual = jest.requireActual("@/lib/bookingTime");
  return { ...actual, getViewerTimeZone: jest.fn() };
});

const uuid = "7b7ad66c-3a2b-4cc9-95ba-95f9148f818e";
const tourRef = `${uuid}-campus-life`;

const tour: TourDetail = {
  id: uuid,
  title: "Campus life and hidden study spots",
  slug: "campus-life",
  topic: "GENERAL_CAMPUS",
  universityId: "u1",
  universityName: "North Coast University",
  universityImageUrl: null,
  guideId: "g1",
  guideDisplayName: "Maya Chen",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.8,
  reviewCount: 18,
  languages: ["en-US", "zh"],
  description: "A practical walk through dorms, libraries, and daily routines.",
  universitySlug: "north-coast",
  universityCity: "Evanston",
  universityRegion: "IL",
  guideBio: "I can talk about first-year housing and CS classes.",
};

const slots: OfferingSlot[] = [
  { startAt: "2026-07-10T15:00:00Z", endAt: "2026-07-10T16:00:00Z" },
  { startAt: "2026-07-11T18:00:00Z", endAt: "2026-07-11T19:00:00Z" },
];

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: "booking-1",
    status: "CONFIRMED",
    scheduledStartAt: slots[0].startAt,
    scheduledEndAt: slots[0].endAt,
    durationMinutes: 60,
    tourOfferingId: uuid,
    tourTitle: tour.title,
    guideName: tour.guideDisplayName,
    guideResponseDeadline: null,
    universityName: tour.universityName,
    price: { amount: 4200, currency: "USD" },
    ...overrides,
  };
}

const mockUseTourDetail = useTourDetail as jest.MockedFunction<typeof useTourDetail>;
const mockUseOfferingSlots = useOfferingSlots as jest.MockedFunction<typeof useOfferingSlots>;
const mockUseAddCartItem = useAddCartItem as jest.MockedFunction<typeof useAddCartItem>;
const mockUseCreateBooking = useCreateBooking as jest.MockedFunction<typeof useCreateBooking>;
const mockGetViewerTimeZone = bookingTime.getViewerTimeZone as jest.MockedFunction<
  typeof bookingTime.getViewerTimeZone
>;

const addCartMutateAsync = jest.fn();
const createBookingMutateAsync = jest.fn();
const refetchSlots = jest.fn();

function mockDefaultHooks(slotState: Partial<ReturnType<typeof useOfferingSlots>> = {}) {
  mockUseTourDetail.mockReturnValue({
    data: tour,
    isLoading: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useTourDetail>);
  mockUseOfferingSlots.mockReturnValue({
    data: slots,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchSlots,
    ...slotState,
  } as unknown as ReturnType<typeof useOfferingSlots>);
  mockUseAddCartItem.mockReturnValue({
    isPending: false,
    mutateAsync: addCartMutateAsync,
  } as unknown as ReturnType<typeof useAddCartItem>);
  mockUseCreateBooking.mockReturnValue({
    isPending: false,
    mutateAsync: createBookingMutateAsync,
  } as unknown as ReturnType<typeof useCreateBooking>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetViewerTimeZone.mockReturnValue("America/Chicago");
  addCartMutateAsync.mockResolvedValue(booking({ status: "IN_CART" }));
  createBookingMutateAsync.mockResolvedValue(booking({ status: "WAITING_FOR_GUIDE" }));
  mockDefaultHooks();
});

describe("TourDetailPage", () => {
  it("renders an invalid-link state instead of guessing a non-UUID tour id", () => {
    render(<TourDetailPage tourRef="campus-life" />);

    expect(mockUseTourDetail).toHaveBeenCalledWith("");
    expect(
      screen.getByRole("heading", { name: /couldn't open this tour link/i }),
    ).toBeInTheDocument();
  });

  it("renders tour detail content and keeps slots disabled until the user chooses a time", async () => {
    const user = userEvent.setup();
    render(<TourDetailPage tourRef={tourRef} />);

    expect(screen.getByRole("heading", { level: 1, name: tour.title })).toBeInTheDocument();
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(mockUseTourDetail).toHaveBeenCalledWith(uuid);
    expect(mockUseOfferingSlots).toHaveBeenLastCalledWith(uuid, { enabled: false });
    expect(screen.queryByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book this tour" })).toBeInTheDocument();
    expect(
      screen
        .getByText("Book this tour")
        .compareDocumentPosition(screen.getByText("About this tour")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    await user.click(screen.getByRole("button", { name: /choose time/i }));

    await waitFor(() =>
      expect(mockUseOfferingSlots).toHaveBeenLastCalledWith(uuid, { enabled: true }),
    );
    expect(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).toBeInTheDocument();
  });

  it("adds the selected slot to cart using the slot's original UTC startAt", async () => {
    const user = userEvent.setup();
    render(<TourDetailPage tourRef={tourRef} />);

    await user.click(screen.getByRole("button", { name: /choose time/i }));
    await user.click(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT"));
    await user.type(
      screen.getByLabelText(/notes for the guide/i),
      "Please start near the library.",
    );
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    await waitFor(() =>
      expect(addCartMutateAsync).toHaveBeenCalledWith({
        tourOfferingId: uuid,
        scheduledStartAt: slots[0].startAt,
        participantNotes: "Please start near the library.",
      }),
    );
    expect(screen.getByRole("heading", { name: "Added to cart" })).toBeInTheDocument();

    await user.click(screen.getByText("Sat, 7/11 · 1:00 PM – 2:00 PM CDT"));
    expect(screen.queryByRole("heading", { name: "Added to cart" })).not.toBeInTheDocument();
  });

  it("shows a booking-action hint until a slot is selected", async () => {
    const user = userEvent.setup();
    render(<TourDetailPage tourRef={tourRef} />);

    await user.click(screen.getByRole("button", { name: /choose time/i }));

    expect(
      await screen.findByText("Select a time to unlock cart and booking actions."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /book now/i })).toBeDisabled();
  });

  it("summarizes the selected slot in viewer-local time before checkout", async () => {
    const user = userEvent.setup();
    render(<TourDetailPage tourRef={tourRef} />);

    await user.click(screen.getByRole("button", { name: /choose time/i }));
    await user.click(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT"));

    const summary = screen.getByRole("group", { name: "Selected time details" });
    expect(within(summary).getByText("Selected time")).toBeInTheDocument();
    expect(within(summary).getByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT")).toBeInTheDocument();
    expect(within(summary).getByText("Duration")).toBeInTheDocument();
    expect(within(summary).getByText("60 minutes")).toBeInTheDocument();
    expect(within(summary).getByText("Browser timezone")).toBeInTheDocument();
    expect(within(summary).getByText("America/Chicago")).toBeInTheDocument();
    expect(
      within(summary).getByText(
        "We save the exact selected time; your screen shows it in your current local timezone.",
      ),
    ).toBeInTheDocument();
  });

  it("announces an in-flight booking action without clearing the selected slot", async () => {
    const user = userEvent.setup();
    mockUseAddCartItem.mockReturnValue({
      isPending: true,
      mutateAsync: addCartMutateAsync,
    } as unknown as ReturnType<typeof useAddCartItem>);

    render(<TourDetailPage tourRef={tourRef} />);
    await user.click(screen.getByRole("button", { name: /choose time/i }));
    await user.click(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT"));

    expect(
      screen.getByText("Saving your selected time. Keep this tab open until the request finishes."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /10:00 AM/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /book now/i })).toBeDisabled();
  });

  it("shows tour-detail load errors in the detail route empty state", () => {
    mockUseTourDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Tour vanished"),
    } as unknown as ReturnType<typeof useTourDetail>);

    render(<TourDetailPage tourRef={tourRef} />);

    expect(screen.getByRole("heading", { name: "Tour unavailable" })).toBeInTheDocument();
    expect(screen.getByText("This tour could not be loaded right now.")).toBeInTheDocument();
  });

  it("renders a slots fetch error and retries from the inline action", async () => {
    const user = userEvent.setup();
    mockDefaultHooks({
      data: undefined,
      isError: true,
      error: new Error("Slots offline"),
    });

    render(<TourDetailPage tourRef={tourRef} />);
    await user.click(screen.getByRole("button", { name: /choose time/i }));

    expect(screen.getByRole("heading", { name: "Times are unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Times are unavailable");
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchSlots).toHaveBeenCalledTimes(1);
  });

  it("shows a booking mutation error without dropping the selected slot", async () => {
    const user = userEvent.setup();
    addCartMutateAsync.mockRejectedValueOnce(new Error("Taken"));

    render(<TourDetailPage tourRef={tourRef} />);
    await user.click(screen.getByRole("button", { name: /choose time/i }));
    await user.click(await screen.findByText("Fri, 7/10 · 10:00 AM – 11:00 AM CDT"));
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /10:00 AM/i })).toBeChecked();
  });

  it("books directly with the selected slot's original UTC startAt", async () => {
    const user = userEvent.setup();
    render(<TourDetailPage tourRef={tourRef} />);

    await user.click(screen.getByRole("button", { name: /choose time/i }));
    await user.click(await screen.findByText("Sat, 7/11 · 1:00 PM – 2:00 PM CDT"));
    await user.click(screen.getByRole("button", { name: /book now/i }));

    await waitFor(() =>
      expect(createBookingMutateAsync).toHaveBeenCalledWith({
        tourOfferingId: uuid,
        scheduledStartAt: slots[1].startAt,
      }),
    );
    expect(screen.getByRole("heading", { name: "Booking requested" })).toBeInTheDocument();
  });

  it("shows an empty slots state when the offering has no bookable times", async () => {
    const user = userEvent.setup();
    mockDefaultHooks({ data: [] });

    render(<TourDetailPage tourRef={tourRef} />);
    await user.click(screen.getByRole("button", { name: /choose time/i }));

    expect(screen.getByRole("heading", { name: "No open times yet" })).toBeInTheDocument();
    expect(screen.getByText("No bookable times are open for this tour yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse other tours" })).toHaveAttribute(
      "href",
      "/tours",
    );
  });
});
