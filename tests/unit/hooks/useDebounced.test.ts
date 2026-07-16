import { act, renderHook } from "@testing-library/react";
import { useDebounced } from "@/hooks/useDebounced";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useDebounced", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounced("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("keeps the OLD value until the delay elapses, then returns the new one", () => {
    const { result, rerender } = renderHook(({ value, ms }) => useDebounced(value, ms), {
      initialProps: { value: "a", ms: 300 },
    });

    expect(result.current).toBe("a");

    rerender({ value: "b", ms: 300 });
    // Not enough time has passed — still the old value.
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("settles only to the last value across rapid successive changes", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: "c" });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: "d" });

    // The earlier timers were cleared; still the original value.
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(300);
    });
    // Only the final value "d" settles — intermediate "b"/"c" never surface.
    expect(result.current).toBe("d");
  });

  it("respects a changed delay", () => {
    const { result, rerender } = renderHook(({ value, ms }) => useDebounced(value, ms), {
      initialProps: { value: "a", ms: 300 },
    });

    // Change both the value and the delay.
    rerender({ value: "b", ms: 1000 });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    // The old 300ms window no longer applies — the new 1000ms delay governs.
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current).toBe("b");
  });

  it("works with non-string values", () => {
    const obj1 = { n: 1 };
    const obj2 = { n: 2 };
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 200), {
      initialProps: { value: obj1 },
    });

    expect(result.current).toBe(obj1);

    rerender({ value: obj2 });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(obj2);
  });
});
