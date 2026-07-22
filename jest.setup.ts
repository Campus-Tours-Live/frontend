// Adds custom matchers like toBeInTheDocument(), toHaveClass(), etc.
import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia. Provide a minimal stub; treat the test environment as
// desktop (min-width: 1024px) so desktop-gated UI (e.g. the collapsing header) is exercised.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("min-width: 1024px"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
