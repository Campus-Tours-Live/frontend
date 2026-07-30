import { render, screen } from "@testing-library/react";

// redirect() throws in real Next (halting render); mock it to throw a sentinel so
// we can both assert the target and that control stops there.
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));
jest.mock("@/components/signup/ParticipantOnboardingForm", () => ({
  ParticipantOnboardingForm: () => <div data-testid="participant-onboarding-form" />,
}));

import { redirect } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getServerMe } from "@/lib/http/serverMe";
import { queryKeys } from "@/lib/data-access/keys";
import ParticipantOnboardingPage from "@/app/(auth)/onboarding/participant/page";
import { pendingMe, provisionedMe } from "../../support/meFixtures";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

/**
 * The page seeds the query cache via `MeHydration`, so it needs a real client in context —
 * in production the root layout's `QueryProvider` supplies one. Returning the client lets each
 * render assertion also prove the principal actually landed in the cache; without that the
 * tests would only show the form rendered, which stays true even if hydration silently no-ops
 * and the client refetches what the server already had.
 */
function renderPage(el: React.ReactElement) {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}>{el}</QueryClientProvider>);
  return client;
}

describe("/onboarding/participant page guard", () => {
  it("redirects to /signin when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(ParticipantOnboardingPage()).rejects.toThrow("REDIRECT:/signin");
  });

  it("renders the participant onboarding form for a PENDING user (first onboarding)", async () => {
    const me = pendingMe();
    getServerMeMock.mockResolvedValue(me);
    const el = await ParticipantOnboardingPage();
    const client = renderPage(el);
    expect(screen.getByTestId("participant-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    // The pending IDENTITY claims are the form's only prefill source (Core has no row yet),
    // so this seed is what saves the client round-trip rather than merely duplicating it.
    expect(client.getQueryData(queryKeys.me())).toEqual(me);
    expect(client.getQueryData(queryKeys.session())).toBe(true);
  });

  it("redirects a user who already holds PARTICIPANT to /dashboard", async () => {
    getServerMeMock.mockResolvedValue(
      provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
    );
    await expect(ParticipantOnboardingPage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders the participant onboarding form for an eligible user", async () => {
    const me = provisionedMe({ roles: ["GUIDE"], currentRole: "GUIDE" });
    getServerMeMock.mockResolvedValue(me);
    const el = await ParticipantOnboardingPage();
    const client = renderPage(el);
    expect(screen.getByTestId("participant-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    // Second-role acquisition seeds the PROVISIONED principal, not a pending stand-in — the
    // form's prefill source differs between the two cases.
    expect(client.getQueryData(queryKeys.me())).toEqual(me);
  });
});
