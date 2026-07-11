import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklySchedulePanel } from "@/components/availability/WeeklySchedulePanel";
import type { AvailabilityRule } from "@/lib/data-access";

const mondayRule: AvailabilityRule = {
  id: "rule-mon",
  dayOfWeek: 1,
  startLocal: "09:00",
  windowMin: 120,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};

const mondayOverlapRule: AvailabilityRule = {
  id: "rule-mon-2",
  dayOfWeek: 1,
  startLocal: "10:00",
  windowMin: 60,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};

const tuesdayInactiveRule: AvailabilityRule = {
  id: "rule-tue",
  dayOfWeek: 2,
  startLocal: "14:00",
  windowMin: 30,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: false,
};

describe("WeeklySchedulePanel", () => {
  it("shows 'Unavailable' for every day when there are no rules", () => {
    render(
      <WeeklySchedulePanel
        rules={[]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
      />,
    );

    const list = screen.getByRole("list", { name: /weekly hours by day/i });
    // 7 days, all unavailable, none of them have a rule bar.
    expect(within(list).getAllByText("Unavailable")).toHaveLength(7);
  });

  it("renders one bar per rule, grouped under its own day, sorted by start time", () => {
    render(
      <WeeklySchedulePanel
        rules={[mondayOverlapRule, mondayRule]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
      />,
    );

    // Both overlapping Monday rules render as two separate bars — never merged/coalesced here.
    expect(screen.getByText("9:00 AM · 2h")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM · 1h")).toBeInTheDocument();

    const list = screen.getByRole("list", { name: /weekly hours by day/i });
    const mondayRow = within(list).getByText("Monday").closest('[role="listitem"]') as HTMLElement;
    const bars = within(mondayRow).getAllByText(/AM · |PM · /);
    // Sorted by startLocal ascending: 9:00 AM before 10:00 AM.
    expect(bars[0]).toHaveTextContent("9:00 AM · 2h");
    expect(bars[1]).toHaveTextContent("10:00 AM · 1h");
  });

  it("dims an inactive rule's bar with opacity-60", () => {
    render(
      <WeeklySchedulePanel
        rules={[tuesdayInactiveRule]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
      />,
    );

    expect(screen.getByText("2:00 PM · 30m").closest("div")).toHaveClass("opacity-60");
  });

  it("does not dim an active rule's bar", () => {
    render(
      <WeeklySchedulePanel
        rules={[mondayRule]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
      />,
    );

    expect(screen.getByText("9:00 AM · 2h").closest("div")).not.toHaveClass("opacity-60");
  });

  it("calls onEditRule with the clicked rule", async () => {
    const user = userEvent.setup();
    const onEditRule = jest.fn();

    render(
      <WeeklySchedulePanel
        rules={[mondayRule]}
        onAddDay={jest.fn()}
        onEditRule={onEditRule}
        onRemoveRule={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit 9:00 AM · 2h on Monday" }));
    expect(onEditRule).toHaveBeenCalledWith(mondayRule);
  });

  it("calls onRemoveRule with the clicked rule", async () => {
    const user = userEvent.setup();
    const onRemoveRule = jest.fn();

    render(
      <WeeklySchedulePanel
        rules={[mondayRule]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={onRemoveRule}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" }));
    expect(onRemoveRule).toHaveBeenCalledWith(mondayRule);
  });

  it("calls onAddDay with the clicked day's index", async () => {
    const user = userEvent.setup();
    const onAddDay = jest.fn();

    render(
      <WeeklySchedulePanel
        rules={[]}
        onAddDay={onAddDay}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add hours on wednesday/i }));
    expect(onAddDay).toHaveBeenCalledWith(3);
  });

  it("disables Remove only for the rule matching removingRuleId", () => {
    render(
      <WeeklySchedulePanel
        rules={[mondayRule, mondayOverlapRule]}
        onAddDay={jest.fn()}
        onEditRule={jest.fn()}
        onRemoveRule={jest.fn()}
        removingRuleId="rule-mon-2"
      />,
    );

    expect(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove 10:00 AM · 1h on Monday" })).toBeDisabled();
  });
});
