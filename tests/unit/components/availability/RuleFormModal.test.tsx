import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleFormModal, ruleFormErrorMessage } from "@/components/availability/RuleFormModal";
import { ApiError } from "@/lib/data-access";

describe("RuleFormModal", () => {
  it("submits a new recurring rule with sanitized times", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        timezone="America/Los_Angeles"
        defaultDayOfWeek={1}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add hours" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfWeek: "1",
          startLocal: "09:00",
          endLocal: "22:00",
          timezone: "America/Los_Angeles",
        }),
      ),
    );
  });

  it("prefills edit values from the initial rule", () => {
    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        timezone="America/Los_Angeles"
        initial={{
          id: "r1",
          dayOfWeek: 2,
          startLocal: "10:00",
          endLocal: "13:00",
          timezone: "America/Los_Angeles",
          effectiveFrom: "2026-06-01",
          effectiveTo: null,
          active: true,
          createdAt: null,
        }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit hours" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start time")).toHaveValue("10:00");
    expect(screen.getByLabelText("End time")).toHaveValue("13:00");
  });

  it("surfaces server validation errors via ruleFormErrorMessage", () => {
    expect(
      ruleFormErrorMessage(new ApiError(422, "This time block overlaps an existing rule")),
    ).toBe("This time block overlaps an existing rule");
    expect(ruleFormErrorMessage(new ApiError(500))).toMatch(/Please try again/i);
    expect(ruleFormErrorMessage(new ApiError(422))).toMatch(/check your input/i);
    expect(ruleFormErrorMessage(new Error("network"))).toMatch(/Please try again/i);
  });

  it("wires the dialog accessible name to the title", () => {
    render(
      <RuleFormModal
        open
        onClose={jest.fn()}
        timezone="America/Los_Angeles"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "rule-modal-title");
  });
});
