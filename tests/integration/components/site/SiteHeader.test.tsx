import { type ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";

// Header nav reads the route (useInFunnel / AccountNav) — no app-router in tests.
jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeEach(() => {
  // Logged-out: /auth/session → 200 { authenticated:false }; /v1/userinfo → 401.
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: false }),
      });
    }
    return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
  }) as unknown as typeof fetch;
});

/** Render within a fresh React Query client (header components use useMe). */
function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Flush the mount-time fetch state updates so React doesn't warn about act(). */
const flush = () => act(async () => {});

describe("SiteHeader", () => {
  it("renders the brand logo", async () => {
    renderWithQuery(<SiteHeader />);
    expect(screen.getByAltText(/campustourslive\.ai/i)).toBeInTheDocument();
    await flush();
  });

  it("shows the logged-out account menu + sign-in CTA", async () => {
    renderWithQuery(<SiteHeader />);
    // Logged out → an "Account" dropdown trigger and the single sign-in CTA.
    expect(await screen.findByRole("button", { name: /account/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /sign in or join now/i }).length).toBeGreaterThan(0);
    // The legacy separate "Get started" CTA no longer exists.
    expect(screen.queryByRole("link", { name: /get started/i })).not.toBeInTheDocument();
    await flush();
  });

  it("renders the primary navigation links", async () => {
    renderWithQuery(<SiteHeader />);
    // Links appear in both the desktop inline nav and the mobile drawer.
    expect(screen.getAllByRole("link", { name: /explore tours/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /how it works/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /for students & parents/i }).length).toBeGreaterThan(
      0,
    );
    await flush();
  });
});
