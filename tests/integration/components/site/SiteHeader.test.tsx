import { type ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";

// Header nav reads the route (useInFunnel / AccountNav) and the mounted global
// search (SiteHeaderSearch) uses the app router — provide all three in tests.
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

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

  it("renders no primary navigation links (removed)", async () => {
    renderWithQuery(<SiteHeader />);
    expect(screen.queryByRole("link", { name: /explore tours/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /for students & parents/i })).not.toBeInTheDocument();
    await flush();
  });

  it("Escape closes the Topic panel and returns focus to the Topic trigger without reopening it", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SiteHeader />);
    await flush();

    const trigger = screen.getByRole("button", { name: "Topic" });
    await user.click(trigger);
    expect(await screen.findByRole("region", { name: "Topic" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    // Focusing the trigger must not re-open the panel (it opens on click, not focus).
    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
  });
});
