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
  completeBookingMutation: jest.fn(() => ({ kind: "complete" })),
  markNoShowBookingMutation: jest.fn(() => ({ kind: "noshow" })),
}));

import {
  useAcceptBooking,
  useCompleteBooking,
  useDeclineBooking,
  useMarkNoShowBooking,
} from "@/lib/data-access/hooks/use-guide-booking-actions";
import {
  acceptBookingMutation,
  completeBookingMutation,
  declineBookingMutation,
  markNoShowBookingMutation,
} from "@/lib/data-access/mutations/guide-booking.mutation";

beforeEach(() => {
  useMutationMock.mockReset().mockReturnValue({ mutation: true });
  useQueryClientMock.mockReset().mockReturnValue({ invalidateQueries: jest.fn() });
  (acceptBookingMutation as jest.Mock).mockClear();
  (declineBookingMutation as jest.Mock).mockClear();
  (completeBookingMutation as jest.Mock).mockClear();
  (markNoShowBookingMutation as jest.Mock).mockClear();
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

  it("useCompleteBooking wires completeBookingMutation through TanStack Query", () => {
    const qc = useQueryClientMock();
    const { result } = renderHook(() => useCompleteBooking());

    expect(completeBookingMutation).toHaveBeenCalledWith(qc);
    expect(useMutationMock).toHaveBeenCalledWith({ kind: "complete" });
    expect(result.current).toEqual({ mutation: true });
  });

  it("useMarkNoShowBooking wires markNoShowBookingMutation through TanStack Query", () => {
    const qc = useQueryClientMock();
    const { result } = renderHook(() => useMarkNoShowBooking());

    expect(markNoShowBookingMutation).toHaveBeenCalledWith(qc);
    expect(useMutationMock).toHaveBeenCalledWith({ kind: "noshow" });
    expect(result.current).toEqual({ mutation: true });
  });
});
