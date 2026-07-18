import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { createRef } from "react";
import { useDismiss } from "@/hooks/useDismiss";

describe("useDismiss", () => {
  describe("Escape key", () => {
    it("calls onDismiss when Escape is pressed while enabled", () => {
      const onDismiss = jest.fn();
      renderHook(() => useDismiss({ enabled: true, onDismiss }));

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("does NOT call onDismiss when disabled", () => {
      const onDismiss = jest.fn();
      renderHook(() => useDismiss({ enabled: false, onDismiss }));

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("ignores non-Escape keys", () => {
      const onDismiss = jest.fn();
      renderHook(() => useDismiss({ enabled: true, onDismiss }));

      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "a" });
      fireEvent.keyDown(window, { key: "Esc" }); // not the canonical "Escape"
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("does NOT dismiss on Escape when escape:false", () => {
      const onDismiss = jest.fn();
      renderHook(() => useDismiss({ enabled: true, onDismiss, escape: false }));

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("removes the keydown listener on unmount", () => {
      const onDismiss = jest.fn();
      const { unmount } = renderHook(() => useDismiss({ enabled: true, onDismiss }));

      unmount();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("re-attaches listeners when toggled from disabled to enabled", () => {
      const onDismiss = jest.fn();
      const { rerender } = renderHook(({ enabled }) => useDismiss({ enabled, onDismiss }), {
        initialProps: { enabled: false },
      });

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).not.toHaveBeenCalled();

      rerender({ enabled: true });
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("detaches listeners when toggled from enabled to disabled", () => {
      const onDismiss = jest.fn();
      const { rerender } = renderHook(({ enabled }) => useDismiss({ enabled, onDismiss }), {
        initialProps: { enabled: true },
      });

      rerender({ enabled: false });
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("outside pointer press", () => {
    it("does NOT register pointerdown when outside:false (default)", () => {
      const addSpy = jest.spyOn(document, "addEventListener");
      const onDismiss = jest.fn();
      renderHook(() => useDismiss({ enabled: true, onDismiss }));

      const pointerCalls = addSpy.mock.calls.filter(([type]) => type === "pointerdown");
      expect(pointerCalls).toHaveLength(0);
      addSpy.mockRestore();
    });

    it("dismisses when a pointerdown lands outside the ref element", () => {
      const onDismiss = jest.fn();
      const inside = document.createElement("div");
      const outside = document.createElement("div");
      document.body.append(inside, outside);

      const ref = createRef<HTMLElement>();
      ref.current = inside;

      renderHook(() => useDismiss({ enabled: true, onDismiss, outside: true, ref }));

      fireEvent.pointerDown(outside);
      expect(onDismiss).toHaveBeenCalledTimes(1);

      inside.remove();
      outside.remove();
    });

    it("does NOT dismiss when the pointerdown lands inside the ref element", () => {
      const onDismiss = jest.fn();
      const inside = document.createElement("div");
      const child = document.createElement("span");
      inside.appendChild(child);
      document.body.appendChild(inside);

      const ref = createRef<HTMLElement>();
      ref.current = inside;

      renderHook(() => useDismiss({ enabled: true, onDismiss, outside: true, ref }));

      fireEvent.pointerDown(inside);
      fireEvent.pointerDown(child); // contains() should treat descendant as inside
      expect(onDismiss).not.toHaveBeenCalled();

      inside.remove();
    });

    it("does nothing on outside press when ref is null", () => {
      const onDismiss = jest.fn();
      const ref = createRef<HTMLElement>(); // ref.current stays null
      const target = document.createElement("div");
      document.body.appendChild(target);

      renderHook(() => useDismiss({ enabled: true, onDismiss, outside: true, ref }));

      fireEvent.pointerDown(target);
      expect(onDismiss).not.toHaveBeenCalled();

      target.remove();
    });

    it("removes the pointerdown listener on unmount", () => {
      const onDismiss = jest.fn();
      const inside = document.createElement("div");
      const outside = document.createElement("div");
      document.body.append(inside, outside);

      const ref = createRef<HTMLElement>();
      ref.current = inside;

      const { unmount } = renderHook(() =>
        useDismiss({ enabled: true, onDismiss, outside: true, ref }),
      );

      unmount();
      fireEvent.pointerDown(outside);
      expect(onDismiss).not.toHaveBeenCalled();

      inside.remove();
      outside.remove();
    });

    it("supports Escape and outside dismissal simultaneously", () => {
      const onDismiss = jest.fn();
      const inside = document.createElement("div");
      const outside = document.createElement("div");
      document.body.append(inside, outside);

      const ref = createRef<HTMLElement>();
      ref.current = inside;

      renderHook(() =>
        useDismiss({
          enabled: true,
          onDismiss,
          escape: true,
          outside: true,
          ref,
        }),
      );

      fireEvent.keyDown(window, { key: "Escape" });
      fireEvent.pointerDown(outside);
      expect(onDismiss).toHaveBeenCalledTimes(2);

      inside.remove();
      outside.remove();
    });
  });
});
