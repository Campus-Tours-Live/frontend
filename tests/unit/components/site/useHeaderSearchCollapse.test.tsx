import { renderHook, act } from "@testing-library/react";
import { useHeaderSearchCollapse } from "@/components/site/useHeaderSearchCollapse";

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useHeaderSearchCollapse", () => {
  beforeEach(() => setScroll(0));

  it("is false at the top and true once scrolled past the threshold", () => {
    const { result } = renderHook(() => useHeaderSearchCollapse(80));
    expect(result.current).toBe(false);
    setScroll(120);
    expect(result.current).toBe(true);
    setScroll(10);
    expect(result.current).toBe(false);
  });

  it("is always true when forceCollapsed, regardless of scroll", () => {
    const { result } = renderHook(() => useHeaderSearchCollapse(80, true));
    expect(result.current).toBe(true);
    setScroll(0);
    expect(result.current).toBe(true);
  });
});
