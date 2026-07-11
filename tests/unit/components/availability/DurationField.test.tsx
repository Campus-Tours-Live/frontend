import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DurationField } from "@/components/availability/DurationField";
import { CUSTOM_DURATION_VALUE } from "@/lib/availability/duration";

function DurationFieldHarness({ initialValue = "60" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const [customMinutes, setCustomMinutes] = useState("");

  return (
    <DurationField
      value={value}
      onValueChange={setValue}
      customMinutes={customMinutes}
      onCustomMinutesChange={setCustomMinutes}
    />
  );
}

describe("DurationField", () => {
  it("labels the field as the availability window, not the tour length", () => {
    render(<DurationFieldHarness />);
    expect(screen.getByLabelText("Availability window")).toBeInTheDocument();
    expect(screen.queryByLabelText(/tour length/i)).not.toBeInTheDocument();
    // The hint may clarify the distinction, but nothing should be *labeled* "Tour length".
    expect(screen.queryByText(/^tour length$/i)).not.toBeInTheDocument();
  });

  it("lets the guide pick a 4h preset", async () => {
    const user = userEvent.setup();
    render(<DurationFieldHarness />);

    await user.selectOptions(screen.getByLabelText("Availability window"), "240");

    expect(screen.getByLabelText("Availability window")).toHaveValue("240");
    expect(screen.queryByLabelText("Custom minutes")).not.toBeInTheDocument();
  });

  it("reveals a custom-minutes input when 'Custom…' is selected", async () => {
    const user = userEvent.setup();
    render(<DurationFieldHarness />);

    await user.selectOptions(screen.getByLabelText("Availability window"), CUSTOM_DURATION_VALUE);

    const customInput = screen.getByLabelText("Custom minutes");
    expect(customInput).toBeInTheDocument();

    await user.type(customInput, "75");
    expect(customInput).toHaveValue(75);
  });

  it("surfaces a duration error", () => {
    render(
      <DurationField
        value={CUSTOM_DURATION_VALUE}
        onValueChange={jest.fn()}
        customMinutes=""
        onCustomMinutesChange={jest.fn()}
        error="Enter a valid duration in minutes."
      />,
    );

    expect(screen.getByText("Enter a valid duration in minutes.")).toBeInTheDocument();
  });
});
