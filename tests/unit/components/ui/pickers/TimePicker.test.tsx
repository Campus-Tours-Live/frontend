import { useState, act } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TimePicker,
  valueToParts,
  partsToValue,
  formatDisplay,
  parseHourSegment,
  parseMinuteSegment,
  roundTo5,
  mod,
  centeredIndex,
  recenterIndex,
  valueAt,
  ITEM_HEIGHT,
  MINUTE_OPTIONS,
  HOUR_OPTIONS,
} from "@/components/ui/pickers/TimePicker";

// --------------------------------------------------------------------------
// Pure helpers (the value model + scroll-recentre maths — DOM-free).
// --------------------------------------------------------------------------
describe("TimePicker — pure value model", () => {
  it("valueToParts decodes 24h values (and 24:00 / 00:00 → 12:00 AM)", () => {
    expect(valueToParts("09:00", false)).toEqual({ hour12: 9, minute: 0, period: "AM" });
    expect(valueToParts("13:30", false)).toEqual({ hour12: 1, minute: 30, period: "PM" });
    expect(valueToParts("00:00", false)).toEqual({ hour12: 12, minute: 0, period: "AM" });
    expect(valueToParts("24:00", true)).toEqual({ hour12: 12, minute: 0, period: "AM" });
    expect(valueToParts("12:00", false)).toEqual({ hour12: 12, minute: 0, period: "PM" });
  });

  it("valueToParts snaps an off-grid minute to the nearest 5", () => {
    expect(valueToParts("09:03", false)).toEqual({ hour12: 9, minute: 5, period: "AM" });
    expect(valueToParts("09:58", false)).toEqual({ hour12: 10, minute: 0, period: "AM" });
  });

  it("valueToParts: 24:00 without midnightIsEndOfDay is start-of-day (12:00 AM)", () => {
    expect(valueToParts("24:00", false)).toEqual({ hour12: 12, minute: 0, period: "AM" });
  });

  it("valueToParts: a non-numeric HH/mm segment falls back to 0", () => {
    expect(valueToParts("ab:cd", false)).toEqual({ hour12: 12, minute: 0, period: "AM" });
  });

  it("partsToValue re-encodes, and maps 12:00 AM → 24:00 only when midnightIsEndOfDay", () => {
    expect(partsToValue({ hour12: 9, minute: 0, period: "AM" }, false)).toBe("09:00");
    expect(partsToValue({ hour12: 1, minute: 30, period: "PM" }, false)).toBe("13:30");
    expect(partsToValue({ hour12: 12, minute: 0, period: "AM" }, false)).toBe("00:00");
    expect(partsToValue({ hour12: 12, minute: 0, period: "AM" }, true)).toBe("24:00");
    expect(partsToValue({ hour12: 12, minute: 0, period: "PM" }, false)).toBe("12:00");
  });

  it("formatDisplay renders a 12h label incl. the midnight sentinel", () => {
    expect(formatDisplay("09:00", false)).toBe("9:00 AM");
    expect(formatDisplay("13:05", false)).toBe("1:05 PM");
    expect(formatDisplay("24:00", true)).toBe("12:00 AM");
  });

  it("parseHourSegment keeps 1–12 (last two digits), rejects out-of-range/empty", () => {
    expect(parseHourSegment("1")).toBe(1);
    expect(parseHourSegment("12")).toBe(12);
    expect(parseHourSegment("012")).toBe(12); // last two digits
    expect(parseHourSegment("0")).toBeNull();
    expect(parseHourSegment("13")).toBeNull();
    expect(parseHourSegment("")).toBeNull();
    expect(parseHourSegment("ab")).toBeNull();
  });

  it("parseMinuteSegment snaps to the 5-grid (0–55), rejects >59/empty", () => {
    expect(parseMinuteSegment("30")).toBe(30);
    expect(parseMinuteSegment("32")).toBe(30); // nearest 5
    expect(parseMinuteSegment("58")).toBe(55); // clamps to 55
    expect(parseMinuteSegment("3")).toBe(5);
    expect(parseMinuteSegment("60")).toBeNull();
    expect(parseMinuteSegment("")).toBeNull();
  });

  it("scroll maths: mod / roundTo5 / centeredIndex / valueAt / recenterIndex", () => {
    expect(mod(-1, 12)).toBe(11);
    expect(roundTo5(58)).toBe(60);
    expect(centeredIndex(ITEM_HEIGHT * 3)).toBe(3);
    expect(valueAt(14, MINUTE_OPTIONS, true)).toBe(MINUTE_OPTIONS[2]); // wraps
    expect(valueAt(9, ["AM", "PM"], false)).toBe("PM"); // clamps
    expect(recenterIndex(5, 12, 7)).toBe(17); // first copy → middle band
    expect(recenterIndex(40, 12, 7)).toBe(40);
    expect(recenterIndex(80, 12, 7)).toBe(68); // last copy → pulled down
  });
});

// --------------------------------------------------------------------------
// Segmented closed field.
// --------------------------------------------------------------------------
describe("TimePicker — segmented field", () => {
  it("renders the value as independent hour / minute / AM-PM segments", () => {
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    expect(screen.getByRole("textbox", { name: "Start hour" })).toHaveValue("9");
    expect(screen.getByRole("textbox", { name: "Start minutes" })).toHaveValue("00");
    expect(screen.getByRole("textbox", { name: "Start AM/PM" })).toHaveValue("AM");
  });

  it("typing into the hour segment emits the new 24h value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const hour = screen.getByRole("textbox", { name: "Start hour" });
    await user.clear(hour);
    await user.type(hour, "10");
    expect(onChange).toHaveBeenLastCalledWith("10:00");
  });

  it("typing into the minute segment snaps to the 5-grid", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const min = screen.getByRole("textbox", { name: "Start minutes" });
    await user.clear(min);
    await user.type(min, "30");
    expect(onChange).toHaveBeenLastCalledWith("09:30");
  });

  it("the AM/PM segment toggles the period by typing p / a", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const period = screen.getByRole("textbox", { name: "Start AM/PM" });
    await user.click(period);
    await user.keyboard("p");
    expect(onChange).toHaveBeenCalledWith("21:00");
  });

  it("typing 'a' on the AM/PM segment sets it back to AM", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState("21:00"); // 9:00 PM
      return <TimePicker value={v} onChange={setV} aria-label="Start" />;
    }
    render(<Controlled />);
    const period = screen.getByRole("textbox", { name: "Start AM/PM" });
    expect(period).toHaveValue("PM");
    await user.click(period);
    await user.keyboard("a");
    expect(period).toHaveValue("AM");
  });

  it("arrow keys step the FOCUSED hour/minute segment and update its display", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState("09:00");
      return <TimePicker value={v} onChange={setV} aria-label="Start" />;
    }
    render(<Controlled />);

    const hour = screen.getByRole("textbox", { name: "Start hour" });
    await user.click(hour);
    await user.keyboard("{ArrowUp}");
    // The displayed value updates too — not just the emitted value (the draft used to mask it).
    expect(hour).toHaveValue("10");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(hour).toHaveValue("8");

    const min = screen.getByRole("textbox", { name: "Start minutes" });
    await user.click(min);
    await user.keyboard("{ArrowUp}"); // minutes step by 5
    expect(min).toHaveValue("05");
  });

  it("ArrowUp on the hour segment steps the value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const hour = screen.getByRole("textbox", { name: "Start hour" });
    await user.click(hour);
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("invalid segment input emits nothing (previous value kept)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const hour = screen.getByRole("textbox", { name: "Start hour" });
    await user.clear(hour);
    await user.type(hour, "ab");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("midnightIsEndOfDay: a 12:00 AM segment selection emits the 24:00 sentinel", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="01:00" onChange={onChange} midnightIsEndOfDay aria-label="End" />);
    const hour = screen.getByRole("textbox", { name: "End hour" });
    await user.clear(hour);
    await user.type(hour, "12"); // 12:00 AM (value already AM) → end of day
    expect(onChange).toHaveBeenLastCalledWith("24:00");
  });
});

// --------------------------------------------------------------------------
// Dropdown (wheels).
// --------------------------------------------------------------------------
describe("TimePicker — dropdown", () => {
  it("opening shows Hour / Minute / AM-PM columns", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Minute" })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "AM/PM" })).toBeInTheDocument();
  });

  it("minute options are 5-minute steps (00..55) — 03 is not an option", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const minuteCol = screen.getByRole("listbox", { name: "Minute" });
    const labels = Array.from(
      new Set(
        within(minuteCol)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ),
    );
    expect(labels).toEqual(MINUTE_OPTIONS);
    expect(labels).not.toContain("03");
    expect(MINUTE_OPTIONS).toHaveLength(12);
  });

  it("clicking an hour option emits the correct 24h HH:mm", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const hourCol = screen.getByRole("listbox", { name: "Hour" });
    await user.click(within(hourCol).getAllByText("10")[0]);
    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("clicking AM→PM shifts the hour into the afternoon", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const periodCol = screen.getByRole("listbox", { name: "AM/PM" });
    await user.click(within(periodCol).getByText("PM"));
    expect(onChange).toHaveBeenCalledWith("21:00");
  });

  it("midnightIsEndOfDay: picking 12:00 AM on the wheel emits the 24:00 sentinel", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="01:00" onChange={onChange} midnightIsEndOfDay aria-label="End" />);
    await user.click(screen.getByRole("button", { name: /open end picker/i }));
    const hourCol = screen.getByRole("listbox", { name: "Hour" });
    await user.click(within(hourCol).getAllByText("12")[0]);
    expect(onChange).toHaveBeenCalledWith("24:00");
  });

  it("ArrowDown on a column advances the value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const hourCol = screen.getByRole("listbox", { name: "Hour" });
    hourCol.focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith("10:00"); // 9 → 10
  });

  it("ArrowDown on the non-wrapping AM/PM column steps forward and clamps at the last option", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    function Controlled() {
      const [v, setV] = useState("09:00");
      return (
        <TimePicker
          value={v}
          onChange={(next) => {
            setV(next);
            onChange(next);
          }}
          aria-label="Start"
        />
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const periodCol = screen.getByRole("listbox", { name: "AM/PM" });
    periodCol.focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("21:00"); // AM → PM
    onChange.mockClear();
    await user.keyboard("{ArrowDown}"); // already PM (last option) — clamps, no wrap to AM
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ArrowUp on a column steps backwards", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const hourCol = screen.getByRole("listbox", { name: "Hour" });
    hourCol.focus();
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenCalledWith("08:00"); // 9 → 8
  });

  it("clicking the clock icon while open closes the popover", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    const iconButton = screen.getByRole("button", { name: /open start picker/i });
    await user.click(iconButton);
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    await user.click(iconButton);
    expect(screen.queryByRole("listbox", { name: "Hour" })).not.toBeInTheDocument();
  });

  it("without an aria-label, segments/buttons fall back to bare names", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} />);
    expect(screen.getByRole("textbox", { name: "hour" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "minutes" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "AM/PM" })).toBeInTheDocument();
    const iconButton = screen.getByRole("button", { name: "Open time picker" });
    await user.click(iconButton);
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
  });

  it("flips the popover above the field when there is no room below the viewport", async () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 400 });
    const rectSpy = jest
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        // The field sits near the bottom of a short viewport — no room below, room above.
        const r = { left: 50, right: 200, top: 380, bottom: 396, width: 150, height: 16 };
        return { ...r, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
      });
    try {
      const user = userEvent.setup();
      render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
      await user.click(screen.getByRole("button", { name: /open start picker/i }));
      const popover = screen
        .getByRole("listbox", { name: "Hour" })
        .closest(".tp-popover") as HTMLElement;
      // Flipped up: positioned above the field's top (380), not below its bottom.
      expect(parseFloat(popover.style.top)).toBeLessThan(380);
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });

  it("clicking a minute option emits the correct 24h HH:mm", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const minuteCol = screen.getByRole("listbox", { name: "Minute" });
    await user.click(within(minuteCol).getAllByText("30")[0]);
    expect(onChange).toHaveBeenCalledWith("09:30");
  });

  it("controlled parent: clicking an Hour option round-trips through state (self-emit guard doesn't yank the wheel)", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState("09:00");
      return <TimePicker value={v} onChange={setV} aria-label="Start" />;
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const hourCol = screen.getByRole("listbox", { name: "Hour" });
    await user.click(within(hourCol).getAllByText("10")[0]);
    // The controlled value round-tripped back into the closed field.
    expect(screen.getByRole("textbox", { name: "Start hour" })).toHaveValue("10");
  });

  it("the readOnly AM/PM segment ignores a synthetic change event (key-driven only)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    const period = screen.getByRole("textbox", { name: "Start AM/PM" });
    await user.click(period);
    fireEvent.change(period, { target: { value: "PM" } });
    expect(period).toHaveValue("AM"); // unchanged — the onChange handler bails on readOnly
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Enter on a segment blurs it", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    const hour = screen.getByRole("textbox", { name: "Start hour" });
    await user.click(hour);
    expect(hour).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(hour).not.toHaveFocus();
  });

  it("ArrowUp/Down on the AM/PM segment toggles the period both ways", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState("09:00");
      return <TimePicker value={v} onChange={setV} aria-label="Start" />;
    }
    render(<Controlled />);
    const period = screen.getByRole("textbox", { name: "Start AM/PM" });
    await user.click(period);
    await user.keyboard("{ArrowUp}");
    expect(period).toHaveValue("PM");
    await user.keyboard("{ArrowDown}");
    expect(period).toHaveValue("AM");
  });

  it("Enter while focus is on the Hour wheel (not a segment) closes the popover", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    const hourWheel = screen.getByRole("listbox", { name: "Hour" });
    hourWheel.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("listbox", { name: "Hour" })).not.toBeInTheDocument();
  });

  it("an ancestor scroll (not the wheel's own inner scroll) repositions the popover without closing it", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    fireEvent.scroll(document.body);
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
  });

  it("observes ancestor resize via ResizeObserver (when available) and repositions on trigger", async () => {
    const observed: Element[] = [];
    let triggerCallback: (() => void) | null = null;
    class FakeResizeObserver {
      constructor(cb: () => void) {
        triggerCallback = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
    }
    const original = (global as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = FakeResizeObserver;
    try {
      const user = userEvent.setup();
      render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
      await user.click(screen.getByRole("button", { name: /open start picker/i }));
      expect(observed.length).toBeGreaterThan(0);
      act(() => {
        triggerCallback?.();
      });
      expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    } finally {
      (global as unknown as { ResizeObserver?: unknown }).ResizeObserver = original;
    }
  });
});

// --------------------------------------------------------------------------
// openOnMount + dismissal + disabled.
// --------------------------------------------------------------------------
describe("TimePicker — openOnMount, dismissal, disabled", () => {
  it("openOnMount opens the dropdown and focuses the Hour wheel", () => {
    render(<TimePicker value="09:00" onChange={jest.fn()} openOnMount aria-label="Start" />);
    const hourWheel = screen.getByRole("listbox", { name: "Hour" });
    expect(hourWheel).toBeInTheDocument();
    expect(hourWheel).toHaveFocus();
  });

  it("Escape closes the open dropdown", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Hour" })).not.toBeInTheDocument();
  });

  it("an outside click closes the dropdown", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />
        <button type="button">outside</button>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox", { name: "Hour" })).not.toBeInTheDocument();
  });

  it("disabled: clicking the icon does not open the dropdown", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={jest.fn()} disabled aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /open start picker/i }));
    expect(screen.queryByRole("listbox", { name: "Hour" })).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// Scroll-settle handler (drives the recentre path jsdom can't scroll for real).
// --------------------------------------------------------------------------
describe("TimePicker — scroll settle + recentre", () => {
  let onChange: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    onChange = jest.fn();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function openAndGetScrollEl(name: string) {
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    fireEvent.click(screen.getByRole("button", { name: /open start picker/i }));
    const col = screen.getByRole("listbox", { name });
    return col.querySelector(".tp-col") as HTMLElement;
  }

  it("settling on a centred item emits its value", () => {
    const el = openAndGetScrollEl("Hour");
    el.scrollTop = 39 * ITEM_HEIGHT; // middle band → HOUR_OPTIONS[39 % 12] = "4"
    fireEvent.scroll(el);
    jest.advanceTimersByTime(150);
    expect(HOUR_OPTIONS[39 % 12]).toBe("4");
    expect(onChange).toHaveBeenCalledWith("04:00");
  });

  it("settling inside an edge copy silently recentres scrollTop immediately", () => {
    const el = openAndGetScrollEl("Hour");
    el.scrollTop = 5 * ITEM_HEIGHT; // first copy
    fireEvent.scroll(el);
    expect(el.scrollTop).toBe(recenterIndex(5, 12, 7) * ITEM_HEIGHT); // 17 * 34, synchronous
    jest.advanceTimersByTime(150);
    expect(onChange).toHaveBeenCalledWith("06:00"); // HOUR_OPTIONS[5] = "6"
  });

  it("scrolling again before the settle delay elapses clears the pending commit (only the final one fires)", () => {
    const el = openAndGetScrollEl("Hour");
    el.scrollTop = 39 * ITEM_HEIGHT; // → "4"
    fireEvent.scroll(el);
    jest.advanceTimersByTime(30); // well under SETTLE_MS (90ms)
    el.scrollTop = 40 * ITEM_HEIGHT; // → "5"
    fireEvent.scroll(el);
    jest.advanceTimersByTime(150);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("05:00");
  });

  it("scroll-settle on the non-wrapping AM/PM column clamps to the last valid index", () => {
    const el = openAndGetScrollEl("AM/PM");
    el.scrollTop = 999 * ITEM_HEIGHT; // way past the 2-item range — no wrap, so it must clamp
    fireEvent.scroll(el);
    jest.advanceTimersByTime(150);
    expect(onChange).toHaveBeenCalledWith("21:00"); // clamped to PERIOD_OPTIONS[1] = "PM"
  });
});
