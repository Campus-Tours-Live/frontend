import type { QueryClient } from "@tanstack/react-query";
import { setActiveRoleMutation } from "@/lib/data-access/mutations/set-active-role.mutation";
import { updateParticipantProfileMutation } from "@/lib/data-access/mutations/update-participant-profile.mutation";
import { updateGuideProfileMutation } from "@/lib/data-access/mutations/update-guide-profile.mutation";
import { createOfferingMutation } from "@/lib/data-access/mutations/create-offering.mutation";
import { activateOfferingMutation } from "@/lib/data-access/mutations/activate-offering.mutation";
import {
  createAvailabilityExceptionMutation,
  createAvailabilityRuleMutation,
  deleteAvailabilityExceptionMutation,
  deleteAvailabilityRuleMutation,
  updateAvailabilityExceptionMutation,
  updateAvailabilityRuleMutation,
  updateBookingSettingsMutation,
} from "@/lib/data-access/mutations/availability.mutation";
import { postJson, patchJson, deleteJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

// Mock the HTTP helpers the mutations call so mutationFn does not hit the network.
jest.mock("@/lib/data-access/http", () => ({
  postJson: jest.fn(),
  patchJson: jest.fn(),
  deleteJson: jest.fn(),
}));

const mockedPostJson = postJson as jest.MockedFunction<typeof postJson>;
const mockedPatchJson = patchJson as jest.MockedFunction<typeof patchJson>;
const mockedDeleteJson = deleteJson as jest.MockedFunction<typeof deleteJson>;

/** A QueryClient stub exposing only the method the mutations use. */
function makeQc() {
  return { invalidateQueries: jest.fn() } as unknown as QueryClient;
}

beforeEach(() => {
  mockedPostJson.mockReset().mockResolvedValue({} as never);
  mockedPatchJson.mockReset().mockResolvedValue({} as never);
  mockedDeleteJson.mockReset().mockResolvedValue(undefined as never);
});

/** Collect every queryKey passed to qc.invalidateQueries across all calls. */
function invalidatedKeys(qc: QueryClient): unknown[] {
  const mock = (qc.invalidateQueries as jest.Mock).mock;
  return mock.calls.map((args) => args[0]?.queryKey);
}

describe("setActiveRoleMutation", () => {
  it("mutationFn POSTs to /v1/session/active-role with { role }", async () => {
    const qc = makeQc();
    const { mutationFn } = setActiveRoleMutation(qc);

    await mutationFn("GUIDE" as never);

    expect(mockedPostJson).toHaveBeenCalledTimes(1);
    expect(mockedPostJson).toHaveBeenCalledWith("/v1/session/active-role", {
      role: "GUIDE",
    });
    expect(mockedPatchJson).not.toHaveBeenCalled();
  });

  it("onSuccess invalidates ['me'] and ['dashboard']", () => {
    const qc = makeQc();
    setActiveRoleMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.me());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe("updateParticipantProfileMutation", () => {
  it("mutationFn PATCHes /v1/participant/profile with the body", async () => {
    const qc = makeQc();
    const body = { displayName: "Alice" };
    const { mutationFn } = updateParticipantProfileMutation(qc);

    await mutationFn(body as never);

    expect(mockedPatchJson).toHaveBeenCalledTimes(1);
    expect(mockedPatchJson).toHaveBeenCalledWith("/v1/participant/profile", body);
    expect(mockedPostJson).not.toHaveBeenCalled();
  });

  it("onSuccess invalidates me, participant-profile, dashboard and onboarding(participant)", () => {
    const qc = makeQc();
    updateParticipantProfileMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.me());
    expect(keys).toContainEqual(queryKeys.participantProfile());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(keys).toContainEqual(queryKeys.onboarding("participant"));
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(4);
  });
});

describe("updateGuideProfileMutation", () => {
  it("mutationFn PATCHes /v1/guide/profile with the body", async () => {
    const qc = makeQc();
    const body = { bio: "I lead tours" };
    const { mutationFn } = updateGuideProfileMutation(qc);

    await mutationFn(body as never);

    expect(mockedPatchJson).toHaveBeenCalledTimes(1);
    expect(mockedPatchJson).toHaveBeenCalledWith("/v1/guide/profile", body);
    expect(mockedPostJson).not.toHaveBeenCalled();
  });

  it("onSuccess invalidates me, guide-profile, dashboard and onboarding(guide)", () => {
    const qc = makeQc();
    updateGuideProfileMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.me());
    expect(keys).toContainEqual(queryKeys.guideProfile());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(keys).toContainEqual(queryKeys.onboarding("guide"));
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(4);
  });
});

describe("createOfferingMutation", () => {
  it("mutationFn POSTs /v1/guide/offerings with the body", async () => {
    const qc = makeQc();
    const body = {
      title: "Campus walk",
      universityId: "uni-1",
      topic: "GENERAL_CAMPUS",
      durationMin: 60,
      priceCents: 4200,
    };
    const { mutationFn } = createOfferingMutation(qc);

    await mutationFn(body);

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/guide/offerings", body);
  });

  it("onSuccess invalidates offerings and dashboard", () => {
    const qc = makeQc();
    createOfferingMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.guideOfferings());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe("activateOfferingMutation", () => {
  it("mutationFn POSTs activate with an empty body", async () => {
    const qc = makeQc();
    const { mutationFn } = activateOfferingMutation(qc);

    await mutationFn("offering-1");

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/guide/offerings/offering-1/activate", {});
  });

  it("onSuccess invalidates offerings and dashboard", () => {
    const qc = makeQc();
    activateOfferingMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.guideOfferings());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe("availability mutations", () => {
  it("createAvailabilityRuleMutation POSTs sanitized times", async () => {
    const qc = makeQc();
    const body = { dayOfWeek: 1, startLocal: "09:00", endLocal: "17:00" };
    const { mutationFn } = createAvailabilityRuleMutation(qc);

    await mutationFn(body as never);

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/guide/availability/rules", body);
  });

  it("createAvailabilityRuleMutation skips sanitization when times are omitted", async () => {
    const qc = makeQc();
    const body = { dayOfWeek: 1 };
    const { mutationFn } = createAvailabilityRuleMutation(qc);

    await mutationFn(body as never);

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/guide/availability/rules", body);
  });

  it("updateAvailabilityRuleMutation PATCHes sanitized times", async () => {
    const qc = makeQc();
    const { mutationFn } = updateAvailabilityRuleMutation(qc);

    await mutationFn({ id: "r1", body: { startLocal: "10:00", endLocal: "18:00" } });

    expect(mockedPatchJson).toHaveBeenCalledWith("/v1/guide/availability/rules/r1", {
      startLocal: "10:00",
      endLocal: "18:00",
    });
  });

  it("deleteAvailabilityRuleMutation DELETEs by id", async () => {
    const qc = makeQc();
    const { mutationFn } = deleteAvailabilityRuleMutation(qc);

    await mutationFn("r1");

    expect(mockedDeleteJson).toHaveBeenCalledWith("/v1/guide/availability/rules/r1");
  });

  it("createAvailabilityExceptionMutation POSTs exceptions", async () => {
    const qc = makeQc();
    const body = { exceptionDate: "2026-07-04", type: "UNAVAILABLE_ALL_DAY" };
    const { mutationFn } = createAvailabilityExceptionMutation(qc);

    await mutationFn(body as never);

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/guide/availability/exceptions", body);
  });

  it("updateAvailabilityExceptionMutation PATCHes exceptions", async () => {
    const qc = makeQc();
    const { mutationFn } = updateAvailabilityExceptionMutation(qc);

    await mutationFn({ id: "e1", body: { reason: "Holiday" } });

    expect(mockedPatchJson).toHaveBeenCalledWith("/v1/guide/availability/exceptions/e1", {
      reason: "Holiday",
    });
  });

  it("deleteAvailabilityExceptionMutation DELETEs by id", async () => {
    const qc = makeQc();
    const { mutationFn } = deleteAvailabilityExceptionMutation(qc);

    await mutationFn("e1");

    expect(mockedDeleteJson).toHaveBeenCalledWith("/v1/guide/availability/exceptions/e1");
  });

  it("updateBookingSettingsMutation PATCHes booking settings", async () => {
    const qc = makeQc();
    const body = { minNoticeMin: 720 };
    const { mutationFn } = updateBookingSettingsMutation(qc);

    await mutationFn(body);

    expect(mockedPatchJson).toHaveBeenCalledWith("/v1/guide/availability/booking-settings", body);
  });

  it("availability mutations invalidate guideAvailability on success", () => {
    const qc = makeQc();
    createAvailabilityRuleMutation(qc).onSuccess();
    updateAvailabilityRuleMutation(qc).onSuccess();
    deleteAvailabilityRuleMutation(qc).onSuccess();
    createAvailabilityExceptionMutation(qc).onSuccess();
    updateAvailabilityExceptionMutation(qc).onSuccess();
    deleteAvailabilityExceptionMutation(qc).onSuccess();
    updateBookingSettingsMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(
      keys.filter((k) => JSON.stringify(k) === JSON.stringify(queryKeys.guideAvailability())),
    ).toHaveLength(7);
  });
});
