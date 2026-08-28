import { renderHook } from "@testing-library/react";

const useMutationMock = jest.fn();
const useQueryClientMock = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => useQueryClientMock(),
}));

jest.mock("@/lib/data-access/mutations/guide-booking.mutation", () => ({
  acceptBookingMutation: jest.fn(() => ({ kind: "accept" })),
  declineBookingMutation: jest.fn(() => ({ kind: "decline" })),
}));

import {
  useAcceptBooking,
  useDeclineBooking,
} from "@/lib/data-access/hooks/use-guide-booking-actions";
import {
  acceptBookingMutation,
  declineBookingMutation,
} from "@/lib/data-access/mutations/guide-booking.mutation";

beforeEach(() => {
  useMutationMock.mockReset().mockReturnValue({ mutation: true });
  useQueryClientMock.mockReset().mockReturnValue({ invalidateQueries: jest.fn() });
  (acceptBookingMutation as jest.Mock).mockClear();
  (declineBookingMutation as jest.Mock).mockClear();
});

describe("use-guide-booking-actions", () => {
  it("useAcceptBooking wires acceptBookingMutation through TanStack Query", () => {
    const qc = useQueryClientMock();
    const { result } = renderHook(() => useAcceptBooking());

    expect(acceptBookingMutation).toHaveBeenCalledWith(qc);
    expect(useMutationMock).toHaveBeenCalledWith({ kind: "accept" });
    expect(result.current).toEqual({ mutation: true });
  });

  it("useDeclineBooking wires declineBookingMutation through TanStack Query", () => {
    const qc = useQueryClientMock();
    const { result } = renderHook(() => useDeclineBooking());

    expect(declineBookingMutation).toHaveBeenCalledWith(qc);
    expect(useMutationMock).toHaveBeenCalledWith({ kind: "decline" });
    expect(result.current).toEqual({ mutation: true });
  });
});
