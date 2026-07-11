import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleFormModal, ruleFormErrorMessage } from "@/components/availability/RuleFormModal";
import { ApiError } from "@/lib/data-access";

describe("RuleFormModal", () => {
  it("submits start 22:00 + duration 4h as exactly { startLocal: '22:00', windowMin: 240 } — no endLocal, no timezone", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "22:00" } });
    await user.selectOptions(screen.getByLabelText("Availability window"), "240");

    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.startLocal).toBe("22:00");
    expect(payload.windowMin).toBe(240);
    expect(payload).not.toHaveProperty("endLocal");
    expect(payload).not.toHaveProperty("timezone");
  });

  it("submits a midnight-adjacent block (20:00 + 4h) naturally — no sentinel/wraparound", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "20:00" } });
    await user.selectOptions(screen.getByLabelText("Availability window"), "240");
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({ startLocal: "20:00", windowMin: 240 });
    expect(payload).not.toHaveProperty("endLocal");
  });

  it("submits a cross-midnight block (22:00 + 4h) naturally — no sentinel/wraparound", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "22:00" } });
    await user.selectOptions(screen.getByLabelText("Availability window"), "240");
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    // 22:00 + 240min = 02:00 the next calendar day; the form does not compute or reject this —
    // it just passes startLocal/windowMin through, unlike the old end-time-range picker.
    expect(payload).toMatchObject({ startLocal: "22:00", windowMin: 240 });
    expect(payload).not.toHaveProperty("endLocal");
  });

  it("submits the selected weekday and optional effective-date range", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    await user.selectOptions(screen.getByLabelText("Weekday"), "3");
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "09:00" } });
    await user.type(screen.getByLabelText("Effective from (optional)"), "07/15/2026");
    await user.type(screen.getByLabelText("Effective to (optional)"), "08/15/2026");

    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.dayOfWeek).toBe(3);
    expect(payload.effectiveFrom).toBe("2026-07-15");
    expect(payload.effectiveTo).toBe("2026-08-15");
  });

  it("prefills a non-preset windowMin into the custom-minutes input", () => {
    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        initial={{
          id: "r2",
          dayOfWeek: 4,
          startLocal: "10:00",
          windowMin: 75,
          timezone: "America/Los_Angeles",
          effectiveFrom: null,
          effectiveTo: null,
          active: true,
        }}
        onSubmit={jest.fn()}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    expect(screen.getByLabelText("Availability window")).toHaveValue("custom");
    expect(screen.getByLabelText("Custom minutes")).toHaveValue(75);
  });

  it("shows the server error banner and a 'Saving…' submit label while submitting", () => {
    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={jest.fn()}
        submitting
        error="Could not save recurring hours. Please try again."
        settingsTimezone="America/Los_Angeles"
      />,
    );

    expect(
      screen.getByText("Could not save recurring hours. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("prefills edit values from the initial rule using windowMin (no endLocal)", () => {
    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        initial={{
          id: "r1",
          dayOfWeek: 2,
          startLocal: "10:00",
          windowMin: 180,
          timezone: "America/Los_Angeles",
          effectiveFrom: "2026-06-01",
          effectiveTo: null,
          active: true,
        }}
        onSubmit={jest.fn()}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit hours" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start time")).toHaveValue("10:00");
    expect(screen.getByLabelText("Availability window")).toHaveValue("180");
    expect(screen.queryByLabelText("End time")).not.toBeInTheDocument();
  });

  it("rejects an invalid custom duration without silently submitting a value", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    await user.selectOptions(screen.getByLabelText("Availability window"), "custom");
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    expect(await screen.findByText("Enter a valid duration in minutes.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed effective-from date via setError instead of submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    await user.type(screen.getByLabelText("Effective from (optional)"), "not-a-date");
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    expect(await screen.findByText("Use MM/DD/YYYY format")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces server validation errors via ruleFormErrorMessage", () => {
    expect(ruleFormErrorMessage(new ApiError(422, "Overlap"))).toBe("Overlap");
    expect(ruleFormErrorMessage(new ApiError(422, ""))).toMatch(/overlaps another rule/i);
    expect(ruleFormErrorMessage(new ApiError(500))).toMatch(/Could not save recurring hours/i);
    expect(ruleFormErrorMessage(new Error("network"))).toMatch(/Could not save recurring hours/i);
  });

  it("renders nothing when closed", () => {
    render(
      <RuleFormModal
        open={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        settingsTimezone="America/Los_Angeles"
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the read-only booking-settings timezone and never includes it in the submit payload", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    const tzField = screen.getByLabelText("Timezone");
    expect(tzField).toHaveValue("America/Los_Angeles");
    expect(tzField).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "09:00" } });
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty("timezone");
  });

  it("does not block saving when the rule's stored timezone is an alias that differs from the settings timezone", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        initial={{
          id: "r3",
          dayOfWeek: 2,
          startLocal: "10:00",
          windowMin: 60,
          // Alias for America/Los_Angeles — differs textually from settingsTimezone below, and a
          // canonical-only whitelist would reject it. Neither should ever block saving: the tz
          // isn't submitted, and validation here is alias-tolerant.
          timezone: "US/Pacific",
          effectiveFrom: null,
          effectiveTo: null,
          active: true,
        }}
        onSubmit={onSubmit}
        settingsTimezone="America/Los_Angeles"
      />,
    );

    const tzField = screen.getByLabelText("Timezone");
    expect(tzField).toHaveValue("America/Los_Angeles");
    expect(tzField).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("timezone");
  });
});
