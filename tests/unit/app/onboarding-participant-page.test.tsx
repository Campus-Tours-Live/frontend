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
import { getServerMe } from "@/lib/http/serverMe";
import ParticipantOnboardingPage from "@/app/(auth)/onboarding/participant/page";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
});

describe("/onboarding/participant page guard", () => {
  it("redirects to /signin when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(ParticipantOnboardingPage()).rejects.toThrow("REDIRECT:/signin");
  });

  it("redirects a user who already holds PARTICIPANT to /dashboard", async () => {
    getServerMeMock.mockResolvedValue({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" });
    await expect(ParticipantOnboardingPage()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("renders the participant onboarding form for an eligible user", async () => {
    getServerMeMock.mockResolvedValue({ roles: ["GUIDE"], currentRole: "GUIDE" });
    const el = await ParticipantOnboardingPage();
    render(el);
    expect(screen.getByTestId("participant-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
