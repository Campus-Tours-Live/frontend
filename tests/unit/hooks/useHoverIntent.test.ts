import { act, renderHook } from "@testing-library/react";
import { useHoverIntent } from "@/hooks/useHoverIntent";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useHoverIntent", () => {
  it("openNow calls onOpen synchronously (no delay)", () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const { result } = renderHook(() => useHoverIntent({ onOpen, onClose }));

    act(() => result.current.openNow());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("scheduleClose calls onClose only after the default delay (150ms)", () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const { result } = renderHook(() => useHoverIntent({ onOpen, onClose }));

    act(() => result.current.scheduleClose());
    expect(onClose).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(149));
    expect(onClose).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("honors a custom closeDelay", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useHoverIntent({ onOpen: jest.fn(), onClose, closeDelay: 500 }),
    );

    act(() => result.current.scheduleClose());
    act(() => jest.advanceTimersByTime(499));
    expect(onClose).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("openNow cancels a pending scheduled close (intent across the gap)", () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const { result } = renderHook(() => useHoverIntent({ onOpen, onClose }));

    act(() => result.current.scheduleClose());
    act(() => jest.advanceTimersByTime(100));
    // Re-enter before the delay elapses.
    act(() => result.current.openNow());
    act(() => jest.advanceTimersByTime(200));

    expect(onClose).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("cancelClose cancels a pending scheduled close", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));

    act(() => result.current.scheduleClose());
    act(() => result.current.cancelClose());
    act(() => jest.advanceTimersByTime(1000));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a second scheduleClose resets the timer (only fires once, late)", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));

    act(() => result.current.scheduleClose());
    act(() => jest.advanceTimersByTime(100));
    act(() => result.current.scheduleClose()); // resets the 150ms window
    act(() => jest.advanceTimersByTime(100));
    expect(onClose).not.toHaveBeenCalled(); // 100ms into the new window
    act(() => jest.advanceTimersByTime(50));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cancelClose is a no-op when nothing is scheduled", () => {
    const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose: jest.fn() }));
    expect(() => act(() => result.current.cancelClose())).not.toThrow();
  });

  describe("triggerProps", () => {
    it("onMouseEnter opens immediately", () => {
      const onOpen = jest.fn();
      const { result } = renderHook(() => useHoverIntent({ onOpen, onClose: jest.fn() }));
      act(() => result.current.triggerProps.onMouseEnter());
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("onMouseLeave schedules a delayed close", () => {
      const onClose = jest.fn();
      const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));
      act(() => result.current.triggerProps.onMouseLeave());
      expect(onClose).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(150));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("contentProps", () => {
    it("onMouseEnter cancels a pending close (moving onto the panel keeps it open)", () => {
      const onClose = jest.fn();
      const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));
      act(() => result.current.triggerProps.onMouseLeave()); // leaving trigger
      act(() => jest.advanceTimersByTime(50));
      act(() => result.current.contentProps.onMouseEnter()); // entered panel
      act(() => jest.advanceTimersByTime(200));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("onMouseLeave schedules a delayed close", () => {
      const onClose = jest.fn();
      const { result } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));
      act(() => result.current.contentProps.onMouseLeave());
      act(() => jest.advanceTimersByTime(150));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("clears the pending timer on unmount (onClose never fires after)", () => {
    const onClose = jest.fn();
    const { result, unmount } = renderHook(() => useHoverIntent({ onOpen: jest.fn(), onClose }));

    act(() => result.current.scheduleClose());
    unmount();
    act(() => jest.advanceTimersByTime(1000));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps cancelClose stable across re-renders (depends only on stable refs)", () => {
    // cancelClose's deps are empty, so it is stable regardless of prop identity.
    const { result, rerender } = renderHook(() =>
      useHoverIntent({ onOpen: jest.fn(), onClose: jest.fn() }),
    );
    const firstCancel = result.current.cancelClose;
    rerender();
    expect(result.current.cancelClose).toBe(firstCancel);
  });

  it("keeps openNow/scheduleClose stable when the callbacks keep their identity", () => {
    // openNow depends on onOpen; scheduleClose depends on onClose. Holding those
    // references constant means the memoized handlers stay referentially stable.
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const { result, rerender } = renderHook(() => useHoverIntent({ onOpen, onClose }));
    const first = {
      openNow: result.current.openNow,
      scheduleClose: result.current.scheduleClose,
    };
    rerender();
    expect(result.current.openNow).toBe(first.openNow);
    expect(result.current.scheduleClose).toBe(first.scheduleClose);
  });
});
