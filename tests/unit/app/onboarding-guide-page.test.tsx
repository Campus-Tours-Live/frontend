import { render, screen } from "@testing-library/react";

// redirect() throws in real Next (halting render); mock it to throw a sentinel so
// we can both assert the target and that control stops there.
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
jest.mock("@/lib/http/serverMe", () => ({ getServerMe: jest.fn() }));
jest.mock("@/lib/http/serverParticipantType", () => ({ getServerParticipantType: jest.fn() }));
jest.mock("@/components/signup/GuideOnboardingForm", () => ({
  GuideOnboardingForm: () => <div data-testid="guide-onboarding-form" />,
}));

import { redirect } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getServerMe } from "@/lib/http/serverMe";
import { getServerParticipantType } from "@/lib/http/serverParticipantType";
import { queryKeys } from "@/lib/data-access/keys";
import GuideOnboardingPage from "@/app/(auth)/onboarding/guide/page";
import { pendingMe, provisionedMe } from "../../support/meFixtures";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;
const getServerParticipantTypeMock = getServerParticipantType as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
  getServerParticipantTypeMock.mockReset();
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

describe("/onboarding/guide page guard", () => {
  it("redirects to /signin when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(GuideOnboardingPage()).rejects.toThrow("REDIRECT:/signin");
    expect(getServerParticipantTypeMock).not.toHaveBeenCalled();
  });

  it("renders the guide onboarding form for a PENDING user (first onboarding) without checking participant type", async () => {
    const me = pendingMe();
    getServerMeMock.mockResolvedValue(me);
    const el = await GuideOnboardingPage();
    const client = renderPage(el);
    expect(screen.getByTestId("guide-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getServerParticipantTypeMock).not.toHaveBeenCalled();
    // The pending IDENTITY claims are the form's only prefill source (Core has no row yet),
    // so this seed is what saves the client round-trip rather than merely duplicating it.
    expect(client.getQueryData(queryKeys.me())).toEqual(me);
    expect(client.getQueryData(queryKeys.session())).toBe(true);
  });

  it("redirects a user who already holds GUIDE to /dashboard", async () => {
    getServerMeMock.mockResolvedValue(provisionedMe({ roles: ["GUIDE"], currentRole: "GUIDE" }));
    await expect(GuideOnboardingPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(getServerParticipantTypeMock).not.toHaveBeenCalled();
  });

  it("redirects a PARENT participant to /signup/role?error=parent_no_guide", async () => {
    getServerMeMock.mockResolvedValue(
      provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
    );
    getServerParticipantTypeMock.mockResolvedValue("PARENT");
    await expect(GuideOnboardingPage()).rejects.toThrow(
      "REDIRECT:/signup/role?error=parent_no_guide",
    );
  });

  it("renders the guide onboarding form for an eligible user", async () => {
    const me = provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" });
    getServerMeMock.mockResolvedValue(me);
    getServerParticipantTypeMock.mockResolvedValue("STUDENT");
    const el = await GuideOnboardingPage();
    const client = renderPage(el);
    expect(screen.getByTestId("guide-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    // Second-role acquisition seeds the PROVISIONED principal, not a pending stand-in — the
    // form's prefill source differs between the two cases.
    expect(client.getQueryData(queryKeys.me())).toEqual(me);
  });
});
