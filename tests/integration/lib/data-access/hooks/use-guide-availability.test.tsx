import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useOfferingSlots,
  useResolvedAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
  useUpdateAvailabilitySettings,
} from "@/lib/data-access/hooks/use-guide-availability";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    json: async () => body,
  } as unknown as Response;
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useAvailabilityRules", () => {
  it("GETs /v1/availability/rules and returns the list", async () => {
    const rules = [{ id: "r1", dayOfWeek: 1, startLocal: "22:00", windowMin: 240 }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: rules }));

    const { result } = renderHook(() => useAvailabilityRules(), {
      wrapper: wrapperFor(makeClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/rules",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(rules);
  });
});

describe("useAvailabilityExceptions", () => {
  it("GETs /v1/availability/exceptions and returns the list", async () => {
    const exceptions = [
      {
        id: "e1",
        exceptionDate: "2026-07-04",
        kind: "UNAVAILABLE",
        startLocal: "00:00",
        windowMin: 1440,
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: exceptions }));

    const { result } = renderHook(() => useAvailabilityExceptions(), {
      wrapper: wrapperFor(makeClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/exceptions",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(exceptions);
  });
});

describe("useAvailabilitySettings", () => {
  it("GETs /v1/availability/settings", async () => {
    const settings = { guideId: "g1", timezone: "America/Los_Angeles" };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: settings }));

    const { result } = renderHook(() => useAvailabilitySettings(), {
      wrapper: wrapperFor(makeClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/settings",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(settings);
  });
});

describe("useResolvedAvailability", () => {
  it("GETs /v1/availability and exposes { rules, occurrences, dstGapDays }", async () => {
    const resolved = {
      rules: [{ id: "r1" }],
      occurrences: [{ startAt: "2026-07-12T05:00:00Z", endAt: "2026-07-12T13:00:00Z" }],
      dstGapDays: ["2026-03-08"],
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: resolved }));

    const { result } = renderHook(() => useResolvedAvailability(), {
      wrapper: wrapperFor(makeClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(resolved);
  });
});

describe("useOfferingSlots", () => {
  it("GETs /v1/offerings/{id}/slots", async () => {
    const slots = [{ startAt: "2026-07-12T14:00:00Z", endAt: "2026-07-12T15:00:00Z" }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: slots }));

    const { result } = renderHook(() => useOfferingSlots("o1"), {
      wrapper: wrapperFor(makeClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/offerings/o1/slots",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(slots);
  });
});

describe("useCreateAvailabilityRule", () => {
  it("POSTs { dayOfWeek, startLocal, windowMin } (no endLocal/timezone) and invalidates caches", async () => {
    const created = { id: "r1", dayOfWeek: 1, startLocal: "22:00", windowMin: 240 };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: created, affectedBookings: [] }));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateAvailabilityRule(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ dayOfWeek: 1, startLocal: "22:00", windowMin: 240 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/rules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ dayOfWeek: 1, startLocal: "22:00", windowMin: 240 }),
      }),
    );
    expect(result.current.data).toEqual({ data: created, affectedBookings: [] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["availability-rules"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["availability-resolved"] });
  });
});

describe("useDeleteAvailabilityRule", () => {
  it("DELETEs a rule and resolves with the remaining Rule[]", async () => {
    const remaining = [{ id: "r2", dayOfWeek: 2, startLocal: "10:00", windowMin: 60 }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: remaining, affectedBookings: [] }));

    const { result } = renderHook(() => useDeleteAvailabilityRule(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate("r1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/rules/r1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.current.data).toEqual({ data: remaining, affectedBookings: [] });
  });
});

describe("useUpdateAvailabilityRule", () => {
  it("PATCHes /v1/availability/rules/:id with the body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: "r1", windowMin: 120 }, affectedBookings: [] }),
    );

    const { result } = renderHook(() => useUpdateAvailabilityRule(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate({ id: "r1", body: { windowMin: 120 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/rules/r1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ windowMin: 120 }),
      }),
    );
  });
});

describe("useCreateAvailabilityException", () => {
  it("POSTs /v1/availability/exceptions with the body", async () => {
    const body = {
      exceptionDate: "2026-07-04",
      kind: "UNAVAILABLE" as const,
      startLocal: "00:00",
      windowMin: 1440,
    };
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: "e1", ...body }, affectedBookings: [] }),
    );

    const { result } = renderHook(() => useCreateAvailabilityException(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/exceptions",
      expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
    );
  });
});

describe("useUpdateAvailabilityException", () => {
  it("PATCHes /v1/availability/exceptions/:id with the body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: "e1", reason: "Holiday" }, affectedBookings: [] }),
    );

    const { result } = renderHook(() => useUpdateAvailabilityException(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate({ id: "e1", body: { reason: "Holiday" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/exceptions/e1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ reason: "Holiday" }),
      }),
    );
  });
});

describe("useDeleteAvailabilityException", () => {
  it("DELETEs an exception and resolves with the remaining Exception[]", async () => {
    const remaining = [{ id: "e2", exceptionDate: "2026-08-01", kind: "ADDITIONAL" }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: remaining, affectedBookings: [] }));

    const { result } = renderHook(() => useDeleteAvailabilityException(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate("e1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/exceptions/e1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.current.data).toEqual({ data: remaining, affectedBookings: [] });
  });
});

describe("useUpdateAvailabilitySettings", () => {
  it("PATCHes /v1/availability/settings", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { minNoticeMin: 720 }, affectedBookings: [] }),
    );

    const { result } = renderHook(() => useUpdateAvailabilitySettings(), {
      wrapper: wrapperFor(makeClient()),
    });

    result.current.mutate({ minNoticeMin: 720 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/availability/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ minNoticeMin: 720 }),
      }),
    );
  });
});
