import { QueryClient } from "@tanstack/react-query";
import {
  addCartItemMutation,
  createBookingMutation,
} from "@/lib/data-access/mutations/booking.mutation";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import type { BookingResponse, CreateBookingInput } from "@/lib/data-access/types";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

function makeQc() {
  return { invalidateQueries: jest.fn() } as unknown as QueryClient;
}

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: "booking-1",
    status: "CONFIRMED",
    scheduledStartAt: "2026-07-10T15:00:00Z",
    scheduledEndAt: "2026-07-10T16:00:00Z",
    durationMinutes: 60,
    tourOfferingId: "offering-1",
    tourTitle: "Campus walk",
    guideName: "Maya Chen",
    guideResponseDeadline: null,
    universityName: "North Coast University",
    price: { amount: 4200, currency: "USD" },
    ...overrides,
  };
}

function invalidatedKeys(qc: QueryClient): unknown[] {
  return (qc.invalidateQueries as jest.Mock).mock.calls.map((args) => args[0]?.queryKey);
}

beforeEach(() => {
  mockedApiJson.mockReset().mockResolvedValue(booking() as never);
});

describe("booking/cart mutations", () => {
  it.each([
    ["createBookingMutation", createBookingMutation, "/v1/bookings"],
    ["addCartItemMutation", addCartItemMutation, "/v1/cart/items"],
  ] as const)(
    "%s posts the raw slot instant and refreshes booking surfaces",
    async (_name, build, path) => {
      const qc = makeQc();
      const body: CreateBookingInput = {
        tourOfferingId: "offering-1",
        scheduledStartAt: "2026-07-10T15:00:00Z",
        participantNotes: "Near the library, please.",
      };

      await build(qc).mutationFn(body);
      build(qc).onSuccess(booking(), body);

      expect(mockedApiJson).toHaveBeenCalledWith(
        path,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "Idempotency-Key": expect.any(String),
          }),
        }),
      );
      expect(invalidatedKeys(qc)).toEqual([
        queryKeys.dashboard(),
        queryKeys.cart(),
        queryKeys.offeringSlots("offering-1"),
      ]);
    },
  );

  it("invalidates both variable and response offering slots when they differ", () => {
    const qc = makeQc();
    const body = {
      tourOfferingId: "offering-requested",
      scheduledStartAt: "2026-07-10T15:00:00Z",
    };

    createBookingMutation(qc).onSuccess(booking({ tourOfferingId: "offering-created" }), body);

    expect(invalidatedKeys(qc)).toEqual([
      queryKeys.dashboard(),
      queryKeys.cart(),
      queryKeys.offeringSlots("offering-requested"),
      queryKeys.offeringSlots("offering-created"),
    ]);
  });
});
