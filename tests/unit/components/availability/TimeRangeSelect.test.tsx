import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeRangeSelect } from "@/components/availability/TimeRangeSelect";

function TimeRangeHarness({
  initialStart = "09:00",
  initialEnd = "17:00",
}: {
  initialStart?: string;
  initialEnd?: string;
}) {
  const [startLocal, setStartLocal] = useState(initialStart);
  const [endLocal, setEndLocal] = useState(initialEnd);

  return (
    <TimeRangeSelect
      startLocal={startLocal}
      endLocal={endLocal}
      onStartLocalChange={setStartLocal}
      onEndLocalChange={setEndLocal}
    />
  );
}

describe("TimeRangeSelect", () => {
  it("renders start and end pickers with 15-minute options", () => {
    render(<TimeRangeHarness />);

    expect(screen.getByLabelText("Start time")).toHaveValue("09:00");
    expect(screen.getByLabelText("End time")).toHaveValue("17:00");
  });

  it("coerces end time when start moves later than the current end", async () => {
    const user = userEvent.setup();
    render(<TimeRangeHarness initialStart="09:00" initialEnd="10:00" />);

    await user.selectOptions(screen.getByLabelText("Start time"), "10:00");

    expect(screen.getByLabelText("Start time")).toHaveValue("10:00");
    expect(screen.getByLabelText("End time")).toHaveValue("11:00");
  });

  it("updates end time when the user picks a later slot", async () => {
    const user = userEvent.setup();
    render(<TimeRangeHarness />);

    await user.selectOptions(screen.getByLabelText("End time"), "18:00");

    expect(screen.getByLabelText("End time")).toHaveValue("18:00");
  });
});
