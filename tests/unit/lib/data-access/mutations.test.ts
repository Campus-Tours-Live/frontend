import { QueryClient } from "@tanstack/react-query";
import { setCurrentRoleMutation } from "@/lib/data-access/mutations/set-current-role.mutation";
import { updateParticipantProfileMutation } from "@/lib/data-access/mutations/update-participant-profile.mutation";
import { updateGuideProfileMutation } from "@/lib/data-access/mutations/update-guide-profile.mutation";
import { createOfferingMutation } from "@/lib/data-access/mutations/create-offering.mutation";
import { activateOfferingMutation } from "@/lib/data-access/mutations/activate-offering.mutation";
import { postJson, patchJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import type { Me } from "@/lib/data-access/types";

// Mock the HTTP helpers the mutations call so mutationFn does not hit the network.
jest.mock("@/lib/data-access/http", () => ({
  postJson: jest.fn(),
  patchJson: jest.fn(),
}));

const mockedPostJson = postJson as jest.MockedFunction<typeof postJson>;
const mockedPatchJson = patchJson as jest.MockedFunction<typeof patchJson>;

/** A QueryClient stub exposing only the methods the mutations use. */
function makeQc() {
  return {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    cancelQueries: jest.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient;
}

beforeEach(() => {
  mockedPostJson.mockReset().mockResolvedValue({} as never);
  mockedPatchJson.mockReset().mockResolvedValue({} as never);
});

/** Collect every queryKey passed to qc.invalidateQueries across all calls. */
function invalidatedKeys(qc: QueryClient): unknown[] {
  const mock = (qc.invalidateQueries as jest.Mock).mock;
  return mock.calls.map((args) => args[0]?.queryKey);
}

describe("setCurrentRoleMutation", () => {
  it("mutationFn POSTs to /v1/session/current-role with { role }", async () => {
    const qc = makeQc();
    const { mutationFn } = setCurrentRoleMutation(qc);

    await mutationFn("GUIDE" as never);

    expect(mockedPostJson).toHaveBeenCalledTimes(1);
    expect(mockedPostJson).toHaveBeenCalledWith("/v1/session/current-role", {
      role: "GUIDE",
    });
    expect(mockedPatchJson).not.toHaveBeenCalled();
  });

  it("onSuccess cancels in-flight ['me'] fetches, patches the me cache with the returned currentRole (not a refetch), and invalidates ['dashboard'] only", async () => {
    const qc = makeQc();
    await setCurrentRoleMutation(qc).onSuccess({ currentRole: "GUIDE" });

    // The in-flight ["me"] refetch must be cancelled BEFORE the patch is applied — otherwise
    // a preceding invalidateQueries(["me"]) (e.g. from updateGuide/ParticipantProfile) could
    // still be racing and its stale (not-yet-switched) currentRole could land after the patch.
    expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: queryKeys.me() });
    const cancelOrder = (qc.cancelQueries as jest.Mock).mock.invocationCallOrder[0];
    const setDataOrder = (qc.setQueryData as jest.Mock).mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(setDataOrder);

    // ["me"] is PATCHED, not invalidated — no /userinfo refetch on a successful switch.
    expect(qc.setQueryData).toHaveBeenCalledTimes(1);
    const [key, updater] = (qc.setQueryData as jest.Mock).mock.calls[0] as [
      unknown,
      (prev: unknown) => unknown,
    ];
    expect(key).toEqual(queryKeys.me());

    // The unwrapped Me shape (see me.query.ts / fetchMe) — patch is `p.currentRole`, not
    // `p.data.currentRole`. Other fields survive untouched.
    const prevMe = {
      accountState: "PROVISIONED",
      user: { id: "u1" },
      roles: ["PARTICIPANT", "GUIDE"],
      currentRole: "PARTICIPANT",
    };
    expect(updater(prevMe)).toEqual({ ...prevMe, currentRole: "GUIDE" });
    // No-op when nothing is cached yet — never fabricate a Me from a role alone.
    expect(updater(undefined)).toBeUndefined();
    expect(updater(null)).toBeNull();
    // No-op for a cached PENDING `me` too — a role switch is unreachable for a principal
    // holding no roles; never fabricate a currentRole onto it (CTL-97).
    const pendingMe = { accountState: "PENDING", user: { id: null }, roles: [], currentRole: null };
    expect(updater(pendingMe)).toBe(pendingMe);

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(keys).not.toContainEqual(queryKeys.me());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("CTL-97 regression: a concurrent ['me'] refetch that resolves AFTER onSuccess with the stale (not-yet-switched) currentRole does not clobber the patched role", async () => {
    // A REAL QueryClient is required here — the fix relies on the actual TanStack Query v5
    // cancellation/revert machinery (a stub QueryClient can't reproduce the race).
    const qc = new QueryClient();
    const seeded: Me = {
      accountState: "PROVISIONED",
      user: {
        id: "u1",
        firstName: null,
        lastName: null,
        displayName: null,
        email: null,
        accountStatus: null,
        ageBand: null,
        createdAt: null,
      },
      roles: ["PARTICIPANT", "GUIDE"],
      currentRole: null,
    };
    qc.setQueryData(queryKeys.me(), seeded);

    // Simulate R1: a ["me"] refetch already in flight (e.g. triggered by
    // updateGuideProfileMutation's invalidateQueries(["me"])) whose queryFn resolves LATE,
    // with the session's currentRole not yet switched (still null).
    let resolveLateRefetch!: (me: Me) => void;
    const lateRefetch = new Promise<Me>((resolve) => {
      resolveLateRefetch = resolve;
    });
    const r1 = qc.fetchQuery({ queryKey: queryKeys.me(), queryFn: () => lateRefetch });

    // R2: the current-role switch settles and its onSuccess patches the cache.
    await setCurrentRoleMutation(qc).onSuccess({ currentRole: "GUIDE" });

    // R1 resolves only NOW — strictly after R2's patch — with the stale null it read before
    // the session actually switched.
    resolveLateRefetch({ ...seeded, currentRole: null });
    await r1;

    // The late null refetch must not win: the final cache state is deterministically the
    // switched role in both resolution orderings.
    expect(qc.getQueryData<Me>(queryKeys.me())?.currentRole).toBe("GUIDE");
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

  it("onSuccess invalidates me, participant-profile and dashboard", () => {
    const qc = makeQc();
    updateParticipantProfileMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.me());
    expect(keys).toContainEqual(queryKeys.participantProfile());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3);
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

  it("onSuccess invalidates me, guide-profile and dashboard", () => {
    const qc = makeQc();
    updateGuideProfileMutation(qc).onSuccess();

    const keys = invalidatedKeys(qc);
    expect(keys).toContainEqual(queryKeys.me());
    expect(keys).toContainEqual(queryKeys.guideProfile());
    expect(keys).toContainEqual(queryKeys.dashboard());
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3);
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
