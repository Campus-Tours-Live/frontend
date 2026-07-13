import type { QueryClient } from "@tanstack/react-query";
import {
  updateAvailabilityRuleMutation,
  updateAvailabilitySettingsMutation,
} from "@/lib/data-access/mutations/availability.mutation";
import { postJsonRaw, patchJsonRaw } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

// Mock the HTTP helpers the mutations call so mutationFn does not hit the network.
jest.mock("@/lib/data-access/http", () => ({
  postJsonRaw: jest.fn(),
  patchJsonRaw: jest.fn(),
}));

const mockedPostJsonRaw = postJsonRaw as jest.MockedFunction<typeof postJsonRaw>;
const mockedPatchJsonRaw = patchJsonRaw as jest.MockedFunction<typeof patchJsonRaw>;

/** A QueryClient stub exposing only the method the mutations use. */
function makeQc() {
  return { invalidateQueries: jest.fn() } as unknown as QueryClient;
}

beforeEach(() => {
  mockedPostJsonRaw.mockReset().mockResolvedValue({ data: {}, affectedBookings: [] } as never);
  mockedPatchJsonRaw.mockReset().mockResolvedValue({ data: {}, affectedBookings: [] } as never);
});

/** Collect every queryKey passed to qc.invalidateQueries across all calls. */
function invalidatedKeys(qc: QueryClient): unknown[] {
  const mock = (qc.invalidateQueries as jest.Mock).mock;
  return mock.calls.map((args) => args[0]?.queryKey);
}

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
