import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TimePicker,
  valueToParts,
  partsToValue,
  formatDisplay,
  parseTypedTime,
  roundTo5,
  mod,
  centeredIndex,
  recenterIndex,
  valueAt,
  ITEM_HEIGHT,
  MINUTE_OPTIONS,
  HOUR_OPTIONS,
} from "@/components/ui/TimePicker";

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

  it("parseTypedTime accepts 12h and 24h, rounds to 5, reverts on garbage", () => {
    expect(parseTypedTime("9:30 AM", false)).toBe("09:30");
    expect(parseTypedTime("9:30am", false)).toBe("09:30");
    expect(parseTypedTime("21:30", false)).toBe("21:30");
    expect(parseTypedTime("9:32 AM", false)).toBe("09:30"); // rounds to nearest 5
    expect(parseTypedTime("12:00 AM", false)).toBe("00:00");
    expect(parseTypedTime("12:00 AM", true)).toBe("24:00");
    expect(parseTypedTime("24:00", true)).toBe("24:00");
    expect(parseTypedTime("nope", false)).toBeNull();
    expect(parseTypedTime("13:00 PM", false)).toBeNull(); // 13 invalid for 12h
    expect(parseTypedTime("25:00", false)).toBeNull();
    expect(parseTypedTime("", false)).toBeNull();
  });

  it("scroll maths: mod / roundTo5 / centeredIndex / valueAt / recenterIndex", () => {
    expect(mod(-1, 12)).toBe(11);
    expect(roundTo5(58)).toBe(60);
    expect(centeredIndex(ITEM_HEIGHT * 3)).toBe(3);
    expect(valueAt(14, MINUTE_OPTIONS, true)).toBe(MINUTE_OPTIONS[2]); // wraps
    expect(valueAt(9, ["AM", "PM"], false)).toBe("PM"); // clamps
    // In the first copy → pushed up into the middle band; middle index unchanged.
    expect(recenterIndex(5, 12, 7)).toBe(17);
    expect(recenterIndex(40, 12, 7)).toBe(40);
    expect(recenterIndex(80, 12, 7)).toBe(68); // last copy → pulled down
  });
});

// --------------------------------------------------------------------------
// Field + dropdown behaviour.
// --------------------------------------------------------------------------
describe("TimePicker — field + dropdown", () => {
  it("the closed field renders the formatted value", () => {
    render(<TimePicker value="09:00" onChange={jest.fn()} aria-label="Start" />);
    expect(screen.getByRole("button", { name: /9:00 AM/ })).toBeInTheDocument();
  });

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

  it("midnightIsEndOfDay: picking 12:00 AM emits the 24:00 end-of-day sentinel", async () => {
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
    onChange.mockClear();
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenCalledWith("08:00"); // 9 → 8 (wraps from current value)
  });
});

// --------------------------------------------------------------------------
// Click-to-type inline input.
// --------------------------------------------------------------------------
describe("TimePicker — click-to-type", () => {
  it("typing a 12h time and pressing Enter parses to 24h HH:mm", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /edit as text/i }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "9:30 AM");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("09:30");
  });

  it("typing a 24h time and blurring parses it", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /edit as text/i }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "21:30");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("21:30");
  });

  it("invalid input reverts to the previous value (no onChange)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /edit as text/i }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "not a time");
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /9:00 AM/ })).toBeInTheDocument();
  });

  it("Escape cancels text entry without changing the value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TimePicker value="09:00" onChange={onChange} aria-label="Start" />);
    await user.click(screen.getByRole("button", { name: /edit as text/i }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "11:00");
    await user.keyboard("{Escape}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /9:00 AM/ })).toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// Dismissal + disabled.
// --------------------------------------------------------------------------
describe("TimePicker — dismissal + disabled", () => {
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
  beforeEach(() => jest.useFakeTimers());
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

  let onChange: jest.Mock;
  beforeEach(() => {
    onChange = jest.fn();
  });

  it("settling on a centred item emits its value", () => {
    const el = openAndGetScrollEl("Hour");
    // Middle-band index 39 → value HOUR_OPTIONS[39 % 12] = "4".
    el.scrollTop = 39 * ITEM_HEIGHT;
    fireEvent.scroll(el);
    jest.advanceTimersByTime(100);
    expect(HOUR_OPTIONS[39 % 12]).toBe("4");
    expect(onChange).toHaveBeenCalledWith("04:00");
  });

  it("settling inside an edge copy silently recentres scrollTop", () => {
    const el = openAndGetScrollEl("Hour");
    el.scrollTop = 5 * ITEM_HEIGHT; // first copy
    fireEvent.scroll(el);
    jest.advanceTimersByTime(100);
    expect(el.scrollTop).toBe(recenterIndex(5, 12, 7) * ITEM_HEIGHT); // 17 * 34
    expect(onChange).toHaveBeenCalledWith("06:00"); // HOUR_OPTIONS[5] = "6"
  });
});
