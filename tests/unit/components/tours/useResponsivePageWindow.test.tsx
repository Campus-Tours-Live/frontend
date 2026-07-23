import { act, renderHook } from "@testing-library/react";
import { useResponsivePageWindow } from "@/components/tours/useResponsivePageWindow";

type Listener = () => void;

// Install a matchMedia stub driven by a single mutable width. Every MediaQueryList
// it hands out reads that width live (getter), and all `change` listeners share one
// set so `resize()` re-evaluates the hook exactly as a real viewport change would.
function installMatchMedia(initialWidth: number) {
  let width = initialWidth;
  // A plain array (not a Set): the hook attaches the same `sync` callback to two
  // distinct MediaQueryLists, so we must count both registrations, not dedupe them.
  const listeners: Listener[] = [];
  window.matchMedia = ((query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      get matches() {
        return width >= min;
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
    } as unknown as MediaQueryList;
  }) as unknown as typeof window.matchMedia;
  return {
    resize(next: number) {
      width = next;
      act(() => [...listeners].forEach((cb) => cb()));
    },
    activeListeners: () => listeners.length,
  };
}

describe("useResponsivePageWindow", () => {
  it("shows 3 buttons on a narrow/mobile viewport (<640px)", () => {
    installMatchMedia(320);
    const { result } = renderHook(() => useResponsivePageWindow());
    expect(result.current).toBe(3);
  });

  it("shows 4 buttons on a small tablet (≥640px, <768px)", () => {
    installMatchMedia(700);
    const { result } = renderHook(() => useResponsivePageWindow());
    expect(result.current).toBe(4);
  });

  it("shows 5 buttons on desktop (≥768px)", () => {
    installMatchMedia(1024);
    const { result } = renderHook(() => useResponsivePageWindow());
    expect(result.current).toBe(5);
  });

  it("re-evaluates when the viewport crosses a breakpoint", () => {
    const mm = installMatchMedia(1024);
    const { result } = renderHook(() => useResponsivePageWindow());
    expect(result.current).toBe(5);
    mm.resize(320);
    expect(result.current).toBe(3);
    mm.resize(700);
    expect(result.current).toBe(4);
  });

  it("detaches its media listeners on unmount", () => {
    const mm = installMatchMedia(1024);
    const { unmount } = renderHook(() => useResponsivePageWindow());
    expect(mm.activeListeners()).toBe(2);
    unmount();
    expect(mm.activeListeners()).toBe(0);
  });
});
