import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type Listener = (event: MediaQueryListEvent) => void;

/** Install a matchMedia stub whose `matches` and change-listener behavior we control directly. */
function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners: Listener[] = [];
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_event: string, cb: Listener) => listeners.push(cb),
      removeEventListener: (_event: string, cb: Listener) => {
        const i = listeners.indexOf(cb);
        if (i !== -1) listeners.splice(i, 1);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as unknown as typeof window.matchMedia;
  return {
    change(next: boolean) {
      matches = next;
      act(() => listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent)));
    },
    activeListeners: () => listeners.length,
  };
}

describe("useMediaQuery", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("reads the initial match synchronously (true)", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("reads the initial match synchronously (false)", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("updates when the media query change event fires", () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    mm.change(true);
    expect(result.current).toBe(true);
    mm.change(false);
    expect(result.current).toBe(false);
  });

  it("adds a change listener on mount and removes it on unmount", () => {
    const mm = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(mm.activeListeners()).toBe(1);
    unmount();
    expect(mm.activeListeners()).toBe(0);
  });

  it("falls back to false when matchMedia is unavailable (SSR-safe guard)", () => {
    // @ts-expect-error -- simulate an environment without matchMedia (e.g. SSR/jsdom gap).
    delete window.matchMedia;
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("does not throw or subscribe when matchMedia is unavailable", () => {
    // @ts-expect-error -- simulate an environment without matchMedia.
    delete window.matchMedia;
    expect(() => {
      const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
      unmount();
    }).not.toThrow();
  });
});
