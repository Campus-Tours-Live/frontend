import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
jest.mock("@/components/signup/AuthOptions", () => ({
  AuthOptions: ({ intent, returnTo }: { intent: string; returnTo: string }) => (
    <div data-testid="auth" data-intent={intent} data-returnto={returnTo} />
  ),
}));

import SignInPage from "@/app/(auth)/signin/page";

async function renderSignin(search: { error?: string; returnTo?: string } = {}): Promise<void> {
  const el = await SignInPage({ searchParams: Promise.resolve(search) });
  render(el);
}

describe("/signin page", () => {
  it("renders the welcome state with no error alerts", async () => {
    await renderSignin();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t find an account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/didn.t complete/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("auth")).toHaveAttribute("data-intent", "signin");
  });

  it("shows the not_registered alert", async () => {
    await renderSignin({ error: "not_registered" });
    expect(screen.getByText(/couldn.t find an account/i)).toBeInTheDocument();
  });

  it("shows the auth_failed alert", async () => {
    await renderSignin({ error: "auth_failed" });
    expect(screen.getByText(/didn.t complete/i)).toBeInTheDocument();
  });

  it("passes a safe returnTo through to AuthOptions", async () => {
    await renderSignin({ returnTo: "/dashboard" });
    expect(screen.getByTestId("auth")).toHaveAttribute("data-returnto", "/dashboard");
  });

  it("falls back to the default when returnTo is unsafe (open-redirect guard)", async () => {
    await renderSignin({ returnTo: "//evil.example.com" });
    const auth = screen.getByTestId("auth");
    expect(auth.getAttribute("data-returnto")).not.toContain("evil");
  });
});
