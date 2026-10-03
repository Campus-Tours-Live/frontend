import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGuideNextTour } from "@/lib/data-access/hooks/use-guide-next-tour";
import { acceptBookingMutation } from "@/lib/data-access/mutations/guide-booking.mutation";

const fetchMock = jest.fn();
function response(body: unknown, status = 200) {
  return {
    ok: status === 200,
    status,
    headers: { get: () => null },
    body: null,
    json: async () => body,
  } as unknown as Response;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useGuideNextTour(), { wrapper }) };
}
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as typeof fetch;
});

it("unwraps real bookings and refreshes after a booking mutation", async () => {
  const booking = { id: "b1", status: "CONFIRMED", scheduledAt: "2099-10-02T12:00:00Z" };
  fetchMock.mockResolvedValue(response({ data: [booking] }));
  const { result, client } = setup();
  await waitFor(() => expect(result.current.data).toEqual(booking));
  expect(fetchMock).toHaveBeenCalledWith(
    "/v1/guide/bookings?filter=upcoming",
    expect.objectContaining({ credentials: "same-origin" }),
  );
  fetchMock.mockResolvedValue(response({ data: [] }));
  act(() => {
    acceptBookingMutation(client).onSuccess();
  });
  await waitFor(() => expect(result.current.data).toBeNull());
});

it("keeps failures distinct from an empty schedule and recovers on retry", async () => {
  fetchMock.mockResolvedValue(response({ title: "Unavailable" }, 503));
  const { result } = setup();
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
  fetchMock.mockResolvedValue(response({ data: [] }));
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

it("does not reuse demo-enriched upcoming list data", async () => {
  fetchMock.mockResolvedValue(response({ data: [] }));
  const { result, client } = setup();
  client.setQueryData(
    ["guide-bookings", "upcoming"],
    [{ id: "demo-confirmed", status: "CONFIRMED", scheduledAt: "2099-10-02T12:00:00Z" }],
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});
