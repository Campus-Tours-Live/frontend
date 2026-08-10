import { QueryClient } from "@tanstack/react-query";
import {
  addCartItemMutation,
  cancelBookingMutation,
  checkoutCartMutation,
  createBookingMutation,
  removeCartItemMutation,
} from "@/lib/data-access/mutations/booking.mutation";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import type { BookingResponse } from "@/lib/data-access/types";

jest.mock("@/lib/data-access/http", () => ({
  apiJson: jest.fn(),
}));

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

function expectInvalidatedBookingSurfaces(qc: QueryClient, ...offeringIds: string[]) {
  expect(invalidatedKeys(qc)).toEqual([
    queryKeys.dashboard(),
    queryKeys.cart(),
    ...offeringIds.map((offeringId) => queryKeys.offeringSlots(offeringId)),
  ]);
}

function expectApiJsonWrite(path: string, method: "DELETE" | "POST", body?: unknown) {
  expect(mockedApiJson).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      method,
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        "Idempotency-Key": expect.any(String),
      }),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

beforeEach(() => {
  mockedApiJson.mockReset().mockResolvedValue(booking() as never);
});

describe("booking/cart mutations", () => {
  it("createBookingMutation posts Contract-A booking input and refreshes booking surfaces", async () => {
    const qc = makeQc();
    const body = {
      tourOfferingId: "offering-1",
      scheduledStartAt: "2026-07-10T15:00:00Z",
      participantNotes: "Near the library, please.",
    };

    await createBookingMutation(qc).mutationFn(body);
    createBookingMutation(qc).onSuccess(booking(), body);

    expectApiJsonWrite("/v1/bookings", "POST", body);
    expectInvalidatedBookingSurfaces(qc, "offering-1");
  });

  it("addCartItemMutation posts the same raw slot instant and invalidates cart/dashboard/slots", async () => {
    const qc = makeQc();
    const body = { tourOfferingId: "offering-2", scheduledStartAt: "2026-07-11T15:00:00Z" };

    await addCartItemMutation(qc).mutationFn(body);
    addCartItemMutation(qc).onSuccess(booking({ tourOfferingId: "offering-2" }), body);

    expectApiJsonWrite("/v1/cart/items", "POST", body);
    expectInvalidatedBookingSurfaces(qc, "offering-2");
  });

  it("cancelBookingMutation posts the optional reason to the encoded booking route", async () => {
    const qc = makeQc();

    await cancelBookingMutation(qc).mutationFn({ bookingId: "booking 1", reason: "Plans changed" });
    cancelBookingMutation(qc).onSuccess(booking({ tourOfferingId: "offering-3" }));

    expectApiJsonWrite("/v1/bookings/booking%201/cancel", "POST", { reason: "Plans changed" });
    expectInvalidatedBookingSurfaces(qc, "offering-3");
  });

  it("removeCartItemMutation deletes the encoded cart item and can refresh that offering's slots", async () => {
    const qc = makeQc();

    await removeCartItemMutation(qc).mutationFn({
      cartItemId: "cart/item",
      tourOfferingId: "offering-4",
    });
    removeCartItemMutation(qc).onSuccess([], {
      cartItemId: "cart/item",
      tourOfferingId: "offering-4",
    });

    expectApiJsonWrite("/v1/cart/items/cart%2Fitem", "DELETE");
    expectInvalidatedBookingSurfaces(qc, "offering-4");
  });

  it("checkoutCartMutation posts an empty body and refreshes every checked-out offering slot cache", async () => {
    const qc = makeQc();
    const finalized = [
      booking({ tourOfferingId: "offering-1" }),
      booking({ tourOfferingId: "offering-2" }),
    ];

    await checkoutCartMutation(qc).mutationFn();
    checkoutCartMutation(qc).onSuccess(finalized);

    expectApiJsonWrite("/v1/cart/checkout", "POST", {});
    expectInvalidatedBookingSurfaces(qc, "offering-1", "offering-2");
  });
});
