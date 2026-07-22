import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MonthYearPicker } from "@/components/ui";
import { parseYear } from "@/components/ui/pickers/MonthYearPicker";

/** A tiny controlled harness — mirrors how MonthAvailabilityView wires the picker. */
function Harness({
  initial = new Date(2026, 6, 1), // July 2026
  onChange,
}: {
  initial?: Date;
  onChange?: (next: Date) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <MonthYearPicker
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      aria-label="Month"
    />
  );
}

describe("MonthYearPicker — parseYear (pure)", () => {
  it("accepts a plain in-range year", () => {
    expect(parseYear("2026")).toBe(2026);
    expect(parseYear("  2026  ")).toBe(2026);
  });

  it("rejects empty, non-numeric, and out-of-range input", () => {
    expect(parseYear("")).toBeNull();
    expect(parseYear("   ")).toBeNull();
    expect(parseYear("abcd")).toBeNull();
    expect(parseYear("20xx")).toBeNull();
    expect(parseYear("-5")).toBeNull();
    expect(parseYear("1899")).toBeNull();
    expect(parseYear("2101")).toBeNull();
  });

  it("accepts the boundary years", () => {
    expect(parseYear("1900")).toBe(1900);
    expect(parseYear("2100")).toBe(2100);
  });
});

describe("MonthYearPicker — closed state (prev/next + label)", () => {
  it("shows the current month/year label", () => {
    render(<Harness />);
    expect(screen.getByText("July 2026")).toBeInTheDocument();
  });

  it("'‹' calls onChange with the previous month-start", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /previous month/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(5); // June (0-based)
    expect(arg.getDate()).toBe(1);
  });

  it("'›' calls onChange with the next month-start", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /next month/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(7); // August (0-based)
    expect(arg.getDate()).toBe(1);
  });

  it("steps across a year boundary", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness initial={new Date(2026, 0, 1)} onChange={onChange} />); // Jan 2026

    await user.click(screen.getByRole("button", { name: /previous month/i }));

    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2025);
    expect(arg.getMonth()).toBe(11); // December
  });
});

describe("MonthYearPicker — grid popover", () => {
  it("opens on clicking the label, showing 12 month buttons + year field + steppers", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const labelButton = screen.getByRole("button", { name: "July 2026" });
    expect(labelButton).toHaveAttribute("aria-expanded", "false");

    await user.click(labelButton);

    expect(labelButton).toHaveAttribute("aria-expanded", "true");
    const popover = within(screen.getByRole("dialog"));
    expect(popover.getByRole("button", { name: /previous year/i })).toBeInTheDocument();
    expect(popover.getByRole("button", { name: /next year/i })).toBeInTheDocument();
    expect(popover.getByRole("textbox", { name: /year/i })).toHaveValue("2026");

    for (const month of [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]) {
      expect(popover.getByRole("button", { name: `${month} 2026` })).toBeInTheDocument();
    }
  });

  it("the next-year stepper navigates to the same month in the next year (onChange) and stays open", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    await user.click(popover.getByRole("button", { name: /next year/i }));

    // The year control navigates the calendar at once (same month, next year).
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2027);
    expect(arg.getMonth()).toBe(6); // July (0-based) — month preserved
    expect(arg.getDate()).toBe(1);

    // Popover stays open, and the field + month buttons reflect the new (controlled) year.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(popover.getByRole("textbox", { name: /year/i })).toHaveValue("2027");
    expect(popover.getByRole("button", { name: "July 2027" })).toBeInTheDocument();
  });

  it("the previous-year stepper navigates to the same month in the previous year (onChange)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    await user.click(popover.getByRole("button", { name: /previous year/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2025);
    expect(arg.getMonth()).toBe(6); // July preserved
    expect(popover.getByRole("textbox", { name: /year/i })).toHaveValue("2025");
  });

  it("persists the navigated year after closing and reopening (year change is committed)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    let popover = within(screen.getByRole("dialog"));
    await user.click(popover.getByRole("button", { name: /next year/i }));
    expect(popover.getByRole("textbox", { name: /year/i })).toHaveValue("2027");

    // Close (Escape) without picking a month, then reopen — the navigated year persists,
    // because stepping the year already moved the calendar (unlike the old draft-only model).
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "July 2027" }));
    popover = within(screen.getByRole("dialog"));
    expect(popover.getByRole("textbox", { name: /year/i })).toHaveValue("2027");
  });

  it("typing a valid year and blurring navigates to the same month in that year (onChange)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "2031");
    await user.tab(); // blur

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2031);
    expect(arg.getMonth()).toBe(6); // July preserved
    expect(yearField).toHaveValue("2031");
    expect(popover.getByRole("button", { name: "July 2031" })).toBeInTheDocument();
  });

  it("typing an invalid year reverts to the last valid year on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "abcd");
    await user.tab();

    expect(yearField).toHaveValue("2026");
  });

  it("typing an empty year reverts to the last valid year on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.tab();

    expect(yearField).toHaveValue("2026");
  });

  it("typing an out-of-range year reverts to the last valid year on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "3050");
    await user.tab();

    expect(yearField).toHaveValue("2026");
  });

  it("Enter in the year field commits (like blur) and keeps the popover open", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "2030{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(popover.getByRole("button", { name: "July 2030" })).toBeInTheDocument();
  });

  it("Escape in the year field reverts an in-progress edit and closes the popover", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "abcd");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking a month calls onChange with the shown year's month-start and closes", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    await user.click(popover.getByRole("button", { name: /next year/i })); // navigates -> July 2027
    await user.click(popover.getByRole("button", { name: "March 2027" }));

    // The year step navigated once (July 2027), then the month click navigated again (March 2027).
    expect(onChange).toHaveBeenCalledTimes(2);
    const arg = onChange.mock.calls[1][0] as Date;
    expect(arg.getFullYear()).toBe(2027);
    expect(arg.getMonth()).toBe(2); // March (0-based)
    expect(arg.getDate()).toBe(1);

    // Popover closed after picking.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Label reflects the new controlled value.
    expect(screen.getByText("March 2027")).toBeInTheDocument();
  });

  it("marks the current month/year button as selected (aria-pressed)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));

    expect(popover.getByRole("button", { name: "July 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(popover.getByRole("button", { name: "June 2026" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the selected month highlighted as the shown year changes (stepper)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    await user.click(popover.getByRole("button", { name: /next year/i }));

    // Same month (July), now shown against 2027 — still highlighted.
    expect(popover.getByRole("button", { name: "July 2027" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps the selected month highlighted as the shown year changes (typed)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    const popover = within(screen.getByRole("dialog"));
    const yearField = popover.getByRole("textbox", { name: /year/i });

    await user.clear(yearField);
    await user.type(yearField, "2040");
    await user.tab();

    expect(popover.getByRole("button", { name: "July 2040" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("Esc closes the popover", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const labelButton = screen.getByRole("button", { name: "July 2026" });
    await user.click(labelButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(labelButton).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking the label again while open closes the popover (toggle)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const labelButton = screen.getByRole("button", { name: "July 2026" });
    await user.click(labelButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(labelButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(labelButton).toHaveAttribute("aria-expanded", "false");
  });

  it("falls back to a generic 'Month picker' aria-label on the popover when none is given", async () => {
    const user = userEvent.setup();
    render(<MonthYearPicker value={new Date(2026, 6, 1)} onChange={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "July 2026" }));

    expect(screen.getByRole("dialog", { name: "Month picker" })).toBeInTheDocument();
  });
});

describe("MonthYearPicker — disabled", () => {
  it("disables prev/next/label buttons and does not open the popover", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <MonthYearPicker
        value={new Date(2026, 6, 1)}
        onChange={onChange}
        disabled
        aria-label="Month"
      />,
    );

    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "July 2026" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "July 2026" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
