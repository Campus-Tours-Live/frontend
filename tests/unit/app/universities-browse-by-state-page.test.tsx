import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import UniversitiesByStatePage, {
  metadata,
} from "@/app/(public)/universities/browse-by-state/page";

/**
 * A real provider rather than a mocked hook: this test's job is that the ROUTE renders, and the
 * page now reads the university counts from the query cache. Mocking the hook here would let the
 * route ship without the provider the real app supplies in `app/layout.tsx` — the exact failure
 * this catches.
 *
 * `retry: false` so a query that would fail resolves immediately instead of holding the test open
 * through React Query's backoff.
 */
function renderRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UniversitiesByStatePage />
    </QueryClientProvider>,
  );
}

describe("/universities/browse-by-state route", () => {
  it("renders the browse-by-state page", () => {
    renderRoute();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /find universities and campus tours by state/i,
      }),
    ).toBeInTheDocument();
  });

  /**
   * The counts arrive from Core after paint, so the page must be usable before they do — the state
   * names come from geometry bundled with the app, not from the request. The panel opens on the
   * popular eight rather than all 51, which is what keeps it beside the map instead of past it.
   */
  it("is usable before the counts have arrived", () => {
    renderRoute();

    expect(document.querySelectorAll("li[data-state-code]")).toHaveLength(8);
    expect(screen.getByRole("searchbox", { name: "Search states" })).toBeInTheDocument();
  });

  /** The tile on the home page points here, so the title is what a shared link shows. */
  it("declares page metadata", () => {
    expect(metadata.title).toMatch(/browse universities by state/i);
    expect(metadata.description).toBeTruthy();
  });
});
