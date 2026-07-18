import { act, renderHook } from "@testing-library/react";
import { useHeaderScrollState } from "@/components/site/useHeaderScrollState";

// Queue rAF callbacks and flush them AFTER the scroll handler returns (mirrors real async
// ordering so the hook's frame guard is cleared between scrolls), all inside one act().
let rafQueue: FrameRequestCallback[] = [];

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    const queued = rafQueue;
    rafQueue = [];
    queued.forEach((cb) => cb(0));
  });
}

beforeEach(() => {
  rafQueue = [];
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
});

describe("useHeaderScrollState", () => {
  it("is expanded at the top of the page", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    expect(result.current.isCollapsed).toBe(false);
  });

  it("collapses on a sufficient downward scroll past the threshold", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(200);
    expect(result.current.isCollapsed).toBe(true);
  });

  it("resets accumulation on reversal — a short down move past the threshold does not collapse", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(200); // collapse
    setScroll(150); // up 50 ≥ 12 → expand
    expect(result.current.isCollapsed).toBe(false);
    setScroll(160); // reversal → accumulator resets; down 10 < 20 → stays expanded (though y > 80)
    expect(result.current.isCollapsed).toBe(false);
    setScroll(175); // further down 15 → accumulated 25 ≥ 20 → collapse
    expect(result.current.isCollapsed).toBe(true);
  });

  it("expands on upward scroll once accumulated up ≥ the (smaller) up threshold", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(300); // collapse
    setScroll(285); // up 15 ≥ 12 → expand
    expect(result.current.isCollapsed).toBe(false);
  });

  it("always expands once back at/near the top", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(300);
    expect(result.current.isCollapsed).toBe(true);
    setScroll(10); // ≤ topThreshold
    expect(result.current.isCollapsed).toBe(false);
  });

  it("ignores sub-pixel deltas", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(200); // collapse
    setScroll(200.5); // |delta| < 1 → ignored, stays collapsed
    expect(result.current.isCollapsed).toBe(true);
  });

  it("clamps negative scrollY (iOS overscroll) without collapsing", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(-50); // Math.max(scrollY, 0) → 0 → expanded, no crash
    expect(result.current.isCollapsed).toBe(false);
  });

  it("reports the scroll direction", () => {
    const { result } = renderHook(() => useHeaderScrollState());
    setScroll(200);
    expect(result.current.scrollDirection).toBe("down");
    setScroll(120);
    expect(result.current.scrollDirection).toBe("up");
  });

  it("removes its scroll listener on unmount", () => {
    const remove = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useHeaderScrollState());
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    remove.mockRestore();
  });
});
