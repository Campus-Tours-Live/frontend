import { useForm } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsDateField } from "@/components/availability/UsDateField";

interface FormValues {
  effectiveFrom: string;
}

function UsDateFieldHarness({ optional = false }: { optional?: boolean }) {
  const { control } = useForm<FormValues>({
    defaultValues: { effectiveFrom: "2026-06-01" },
  });

  return (
    <UsDateField
      control={control}
      name="effectiveFrom"
      label="Effective from"
      optional={optional}
    />
  );
}

describe("UsDateField", () => {
  it("displays ISO dates as mm/dd/yyyy", () => {
    render(<UsDateFieldHarness />);
    expect(screen.getByLabelText("Effective from")).toHaveValue("06/01/2026");
  });

  it("normalizes US input to ISO on blur", async () => {
    const user = userEvent.setup();
    render(<UsDateFieldHarness />);

    const input = screen.getByLabelText("Effective from");
    await user.clear(input);
    await user.type(input, "07/04/2026");
    await user.tab();

    expect(input).toHaveValue("07/04/2026");
  });

  it("shows raw text when the stored value is not ISO", () => {
    function RawValueHarness() {
      const { control } = useForm<FormValues>({
        defaultValues: { effectiveFrom: "07/04/2026" },
      });
      return <UsDateField control={control} name="effectiveFrom" label="Effective from" />;
    }

    render(<RawValueHarness />);
    expect(screen.getByLabelText("Effective from")).toHaveValue("07/04/2026");
  });
});
