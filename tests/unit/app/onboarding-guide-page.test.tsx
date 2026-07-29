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
import { getServerMe } from "@/lib/http/serverMe";
import { getServerParticipantType } from "@/lib/http/serverParticipantType";
import GuideOnboardingPage from "@/app/(auth)/onboarding/guide/page";
import { provisionedMe } from "../../support/meFixtures";

const redirectMock = redirect as unknown as jest.Mock;
const getServerMeMock = getServerMe as jest.Mock;
const getServerParticipantTypeMock = getServerParticipantType as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  getServerMeMock.mockReset();
  getServerParticipantTypeMock.mockReset();
});

describe("/onboarding/guide page guard", () => {
  it("redirects to /signin when there is no session", async () => {
    getServerMeMock.mockResolvedValue(null);
    await expect(GuideOnboardingPage()).rejects.toThrow("REDIRECT:/signin");
    expect(getServerParticipantTypeMock).not.toHaveBeenCalled();
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
    getServerMeMock.mockResolvedValue(
      provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
    );
    getServerParticipantTypeMock.mockResolvedValue("STUDENT");
    const el = await GuideOnboardingPage();
    render(el);
    expect(screen.getByTestId("guide-onboarding-form")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
