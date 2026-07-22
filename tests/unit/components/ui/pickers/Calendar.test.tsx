import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar, type CalendarDay } from "@/components/ui";

/** July 2026 has 31 days; 2026-07-01 is a Wednesday. */
function julyDays(overrides: Partial<Record<number, Partial<CalendarDay>>> = {}): CalendarDay[] {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const iso = `2026-07-${String(day).padStart(2, "0")}`;
    return {
      date: iso,
      day,
      content: <span data-testid={`content-${iso}`}>bar</span>,
      ...overrides[day],
    };
  });
}

describe("Calendar", () => {
  it("renders a day cell (button) for every day in the month", () => {
    render(<Calendar year={2026} month={7} days={julyDays()} />);
    expect(screen.getByTestId("calendar-day-2026-07-01")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-07-31")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-day-2026-07-32")).not.toBeInTheDocument();
    // Each cell renders the consumer-supplied content node.
    expect(screen.getByTestId("content-2026-07-15")).toBeInTheDocument();
  });

  it("marks today's cell with the today-outline data marker", () => {
    render(<Calendar year={2026} month={7} days={julyDays({ 15: { isToday: true } })} />);
    const today = screen.getByTestId("calendar-day-2026-07-15");
    expect(today).toHaveAttribute("data-today", "true");
    expect(today).toHaveAttribute("aria-current", "date");
    expect(today.className).toContain("ring-ink");
    expect(screen.getByTestId("calendar-day-2026-07-16")).toHaveAttribute("data-today", "false");
  });

  it("renders a muted day with the hatched/unavailable treatment and no content", () => {
    render(<Calendar year={2026} month={7} days={julyDays({ 20: { muted: true } })} />);
    const muted = screen.getByTestId("calendar-day-2026-07-20");
    expect(muted).toHaveAttribute("data-muted", "true");
    expect(muted.className).toContain("calendar-hatch");
    // Muted cells drop the density-bar content.
    expect(screen.queryByTestId("content-2026-07-20")).not.toBeInTheDocument();
  });

  it("applies the distinct hover outline to the hovered date only", () => {
    render(<Calendar year={2026} month={7} days={julyDays()} hoveredDate="2026-07-10" />);
    expect(screen.getByTestId("calendar-day-2026-07-10").className).toContain(
      "ring-primary ring-offset",
    );
    expect(screen.getByTestId("calendar-day-2026-07-11").className).not.toContain(
      "ring-primary ring-offset",
    );
  });

  it("calls onDayClick with the ISO date when a day is clicked", async () => {
    const user = userEvent.setup();
    const onDayClick = jest.fn();
    render(<Calendar year={2026} month={7} days={julyDays()} onDayClick={onDayClick} />);
    await user.click(screen.getByTestId("calendar-day-2026-07-22"));
    expect(onDayClick).toHaveBeenCalledWith("2026-07-22");
    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it("fires onDayHover with the cell element on enter and nulls on leave", async () => {
    const user = userEvent.setup();
    const onDayHover = jest.fn();
    render(<Calendar year={2026} month={7} days={julyDays()} onDayHover={onDayHover} />);
    const cell = screen.getByTestId("calendar-day-2026-07-05");
    await user.hover(cell);
    expect(onDayHover).toHaveBeenCalledWith("2026-07-05", cell);
    await user.unhover(cell);
    expect(onDayHover).toHaveBeenLastCalledWith(null, null);
  });

  it("renders weekday heads Monday-first by default", () => {
    render(<Calendar year={2026} month={7} days={julyDays()} />);
    const heads = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(heads).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("renders weekday heads Sunday-first when weekStartsOn=0", () => {
    render(<Calendar year={2026} month={7} days={julyDays()} weekStartsOn={0} />);
    const heads = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(heads).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("renders a month navigator when onMonthChange is provided, and forwards month changes", async () => {
    const user = userEvent.setup();
    const onMonthChange = jest.fn();
    render(<Calendar year={2026} month={7} days={julyDays()} onMonthChange={onMonthChange} />);
    expect(screen.getByRole("button", { name: "July 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next month/i }));

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const arg = onMonthChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(7); // August (0-based)
  });

  it("omits the month navigator when onMonthChange is not provided", () => {
    render(<Calendar year={2026} month={7} days={julyDays()} />);
    expect(screen.queryByRole("button", { name: "July 2026" })).not.toBeInTheDocument();
  });

  it("renderDay overrides the per-day content when provided", () => {
    render(
      <Calendar
        year={2026}
        month={7}
        days={julyDays()}
        renderDay={(d) => <span data-testid={`custom-${d.date}`}>{d.day}!</span>}
      />,
    );
    expect(screen.getByTestId("custom-2026-07-05")).toBeInTheDocument();
    expect(screen.queryByTestId("content-2026-07-05")).not.toBeInTheDocument();
  });

  it("fires onDayHover(null, null) when a focused cell loses focus", async () => {
    const user = userEvent.setup();
    const onDayHover = jest.fn();
    render(
      <div>
        <Calendar year={2026} month={7} days={julyDays()} onDayHover={onDayHover} />
        <button type="button">elsewhere</button>
      </div>,
    );
    const cell = screen.getByTestId("calendar-day-2026-07-05");

    await user.click(cell);
    expect(onDayHover).toHaveBeenCalledWith("2026-07-05", cell);

    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(onDayHover).toHaveBeenLastCalledWith(null, null);
  });
});
