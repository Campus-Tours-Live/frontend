import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
jest.mock("@/components/site/Breadcrumb", () => ({
  Breadcrumb: () => <nav data-testid="crumb" />,
}));
jest.mock("@/components/signup/AuthOptions", () => ({
  AuthOptions: ({ intent, returnTo }: { intent: string; returnTo: string }) => (
    <div data-testid="auth" data-intent={intent} data-returnto={returnTo} />
  ),
}));

import SignupGuidePage from "@/app/(auth)/signup/guide/page";
import SignupParticipantPage from "@/app/(auth)/signup/participant/page";

describe("signup landing pages", () => {
  it("guide signup shows its heading and wires AuthOptions to guide onboarding", () => {
    render(<SignupGuidePage />);
    expect(screen.getByText(/apply to become a guide/i)).toBeInTheDocument();
    const auth = screen.getByTestId("auth");
    expect(auth).toHaveAttribute("data-intent", "signup");
    expect(auth).toHaveAttribute("data-returnto", "/onboarding/guide");
  });

  it("participant signup shows its heading and wires AuthOptions to participant onboarding", () => {
    render(<SignupParticipantPage />);
    expect(screen.getByText(/create your participant account/i)).toBeInTheDocument();
    const auth = screen.getByTestId("auth");
    expect(auth).toHaveAttribute("data-intent", "signup");
    expect(auth).toHaveAttribute("data-returnto", "/onboarding/participant");
  });
});
