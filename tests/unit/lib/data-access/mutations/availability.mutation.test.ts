import type { QueryClient } from "@tanstack/react-query";
import {
  createAvailabilityExceptionMutation,
  createAvailabilityRuleMutation,
  deleteAvailabilityExceptionMutation,
  deleteAvailabilityRuleMutation,
  updateAvailabilityExceptionMutation,
  updateAvailabilityRuleMutation,
  updateAvailabilitySettingsMutation,
} from "@/lib/data-access/mutations/availability.mutation";
import { postJsonRaw, patchJsonRaw, deleteJsonRaw } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

// Mock the HTTP helpers the mutations call so mutationFn does not hit the network.
jest.mock("@/lib/data-access/http", () => ({
  postJsonRaw: jest.fn(),
  patchJsonRaw: jest.fn(),
  deleteJsonRaw: jest.fn(),
}));

const mockedPostJsonRaw = postJsonRaw as jest.MockedFunction<typeof postJsonRaw>;
const mockedPatchJsonRaw = patchJsonRaw as jest.MockedFunction<typeof patchJsonRaw>;
const mockedDeleteJsonRaw = deleteJsonRaw as jest.MockedFunction<typeof deleteJsonRaw>;

/** A QueryClient stub exposing only the method the mutations use. */
function makeQc() {
  return { invalidateQueries: jest.fn() } as unknown as QueryClient;
}

beforeEach(() => {
  mockedPostJsonRaw.mockReset().mockResolvedValue({ data: {}, affectedBookings: [] } as never);
  mockedPatchJsonRaw.mockReset().mockResolvedValue({ data: {}, affectedBookings: [] } as never);
  mockedDeleteJsonRaw.mockReset().mockResolvedValue({ data: [], affectedBookings: [] } as never);
});

/** Collect every queryKey passed to qc.invalidateQueries across all calls. */
function invalidatedKeys(qc: QueryClient): unknown[] {
  const mock = (qc.invalidateQueries as jest.Mock).mock;
  return mock.calls.map((args) => args[0]?.queryKey);
}

describe("createAvailabilityRuleMutation", () => {
  it("mutationFn POSTs { dayOfWeek, startLocal, windowMin } — no endLocal, no timezone", async () => {
    const qc = makeQc();
    const body = { dayOfWeek: 1, startLocal: "22:00", windowMin: 240 };
    const { mutationFn } = createAvailabilityRuleMutation(qc);

    await mutationFn(body);

    expect(mockedPostJsonRaw).toHaveBeenCalledTimes(1);
    expect(mockedPostJsonRaw).toHaveBeenCalledWith("/v1/availability/rules", body);
    const [, sentBody] = mockedPostJsonRaw.mock.calls[0];
    expect(sentBody).not.toHaveProperty("endLocal");
    expect(sentBody).not.toHaveProperty("timezone");
  });

  it("surfaces the returned data + affectedBookings", async () => {
    const qc = makeQc();
    const envelope = {
      data: { id: "r1", dayOfWeek: 1, startLocal: "22:00", windowMin: 240 },
      affectedBookings: [{ bookingId: "b1", bookingNumber: "BK-1", status: "CONFIRMED" }],
    };
    mockedPostJsonRaw.mockResolvedValue(envelope as never);
    const { mutationFn } = createAvailabilityRuleMutation(qc);

    await expect(
      mutationFn({ dayOfWeek: 1, startLocal: "22:00", windowMin: 240 }),
    ).resolves.toEqual(envelope);
  });

  it("onSuccess invalidates availability-rules and availability-resolved", () => {
    const qc = makeQc();
    createAvailabilityRuleMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityRules());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe("updateAvailabilityRuleMutation", () => {
  it("mutationFn PATCHes /v1/availability/rules/:id with the body", async () => {
    const qc = makeQc();
    const { mutationFn } = updateAvailabilityRuleMutation(qc);

    await mutationFn({ id: "r1", body: { windowMin: 120 } });

    expect(mockedPatchJsonRaw).toHaveBeenCalledWith("/v1/availability/rules/r1", {
      windowMin: 120,
    });
  });

  it("onSuccess invalidates availability-rules and availability-resolved", () => {
    const qc = makeQc();
    updateAvailabilityRuleMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityRules());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});

describe("deleteAvailabilityRuleMutation", () => {
  it("mutationFn DELETEs /v1/availability/rules/:id and resolves with the remaining list", async () => {
    const qc = makeQc();
    const envelope = { data: [{ id: "r2" }], affectedBookings: [] };
    mockedDeleteJsonRaw.mockResolvedValue(envelope as never);
    const { mutationFn } = deleteAvailabilityRuleMutation(qc);

    await expect(mutationFn("r1")).resolves.toEqual(envelope);
    expect(mockedDeleteJsonRaw).toHaveBeenCalledWith("/v1/availability/rules/r1");
  });

  it("onSuccess invalidates availability-rules and availability-resolved", () => {
    const qc = makeQc();
    deleteAvailabilityRuleMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityRules());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});

describe("createAvailabilityExceptionMutation", () => {
  it("mutationFn POSTs /v1/availability/exceptions with the body", async () => {
    const qc = makeQc();
    const body = {
      exceptionDate: "2026-07-04",
      kind: "UNAVAILABLE",
      startLocal: "00:00",
      windowMin: 1440,
    };
    const { mutationFn } = createAvailabilityExceptionMutation(qc);

    await mutationFn(body as never);

    expect(mockedPostJsonRaw).toHaveBeenCalledWith("/v1/availability/exceptions", body);
  });

  it("onSuccess invalidates availability-exceptions and availability-resolved", () => {
    const qc = makeQc();
    createAvailabilityExceptionMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityExceptions());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});

describe("updateAvailabilityExceptionMutation", () => {
  it("mutationFn PATCHes /v1/availability/exceptions/:id with the body", async () => {
    const qc = makeQc();
    const { mutationFn } = updateAvailabilityExceptionMutation(qc);

    await mutationFn({ id: "e1", body: { reason: "Holiday" } });

    expect(mockedPatchJsonRaw).toHaveBeenCalledWith("/v1/availability/exceptions/e1", {
      reason: "Holiday",
    });
  });

  it("onSuccess invalidates availability-exceptions and availability-resolved", () => {
    const qc = makeQc();
    updateAvailabilityExceptionMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityExceptions());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});

describe("deleteAvailabilityExceptionMutation", () => {
  it("mutationFn DELETEs /v1/availability/exceptions/:id and resolves with the remaining list", async () => {
    const qc = makeQc();
    const envelope = { data: [{ id: "e2" }], affectedBookings: [] };
    mockedDeleteJsonRaw.mockResolvedValue(envelope as never);
    const { mutationFn } = deleteAvailabilityExceptionMutation(qc);

    await expect(mutationFn("e1")).resolves.toEqual(envelope);
    expect(mockedDeleteJsonRaw).toHaveBeenCalledWith("/v1/availability/exceptions/e1");
  });

  it("onSuccess invalidates availability-exceptions and availability-resolved", () => {
    const qc = makeQc();
    deleteAvailabilityExceptionMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilityExceptions());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});

describe("updateAvailabilitySettingsMutation", () => {
  it("mutationFn PATCHes /v1/availability/settings with the body", async () => {
    const qc = makeQc();
    const body = { minNoticeMin: 720 };
    const { mutationFn } = updateAvailabilitySettingsMutation(qc);

    await mutationFn(body);

    expect(mockedPatchJsonRaw).toHaveBeenCalledWith("/v1/availability/settings", body);
  });

  it("onSuccess invalidates availability-settings and availability-resolved", () => {
    const qc = makeQc();
    updateAvailabilitySettingsMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.availabilitySettings());
    expect(keys).toContainEqual(queryKeys.availabilityResolved());
  });
});
