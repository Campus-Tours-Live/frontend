import { fireEvent, render, waitFor } from "@testing-library/react";
import { FocusGuard } from "@/components/ui/focus/FocusGuard";

describe("FocusGuard", () => {
  it("moves focus into the guarded region shortly after mount", async () => {
    render(
      <FocusGuard onGuard={jest.fn()}>
        <button type="button">inside</button>
      </FocusGuard>,
    );
    expect(document.activeElement).toBe(document.body);
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
  });

  it("fires onGuard when the leading sentinel receives focus", () => {
    const onGuard = jest.fn();
    const { container } = render(
      <FocusGuard onGuard={onGuard}>
        <button type="button">inside</button>
      </FocusGuard>,
    );
    const sentinels = container.querySelectorAll('[aria-hidden][tabindex="0"]');
    expect(sentinels).toHaveLength(2);
    fireEvent.focus(sentinels[0]);
    expect(onGuard).toHaveBeenCalledTimes(1);
  });

  it("fires onGuard when the trailing sentinel receives focus", () => {
    const onGuard = jest.fn();
    const { container } = render(
      <FocusGuard onGuard={onGuard}>
        <button type="button">inside</button>
      </FocusGuard>,
    );
    const sentinels = container.querySelectorAll('[aria-hidden][tabindex="0"]');
    fireEvent.focus(sentinels[sentinels.length - 1]);
    expect(onGuard).toHaveBeenCalledTimes(1);
  });

  it("clears the pending focus timeout on unmount", () => {
    const clearSpy = jest.spyOn(window, "clearTimeout");
    const { unmount } = render(
      <FocusGuard onGuard={jest.fn()}>
        <button type="button">inside</button>
      </FocusGuard>,
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("forwards extra props (e.g. className) onto the wrapping div", () => {
    const { container } = render(
      <FocusGuard onGuard={jest.fn()} className="guard-region">
        <button type="button">inside</button>
      </FocusGuard>,
    );
    expect(container.querySelector("div.guard-region")).toBeInTheDocument();
  });
});
