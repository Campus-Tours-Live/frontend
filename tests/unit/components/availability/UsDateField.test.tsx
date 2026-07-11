import { useForm } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsDateField } from "@/components/availability/UsDateField";

interface FormValues {
  effectiveFrom: string | null;
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

/** Wraps the field in a real <form> so blur/submit run react-hook-form's own validate rule. */
function SubmittableHarness({
  defaultValue,
  optional,
  requiredMessage,
  onSubmit,
}: {
  defaultValue: string | null;
  optional?: boolean;
  requiredMessage?: string;
  onSubmit: (values: FormValues) => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { effectiveFrom: defaultValue },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <UsDateField
        control={control}
        name="effectiveFrom"
        label="Effective from"
        optional={optional}
        requiredMessage={requiredMessage}
        error={errors.effectiveFrom?.message}
      />
      <button type="submit">Submit</button>
    </form>
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

  it("leaves an unparsable value untouched on blur instead of clearing it", async () => {
    const user = userEvent.setup();
    render(<UsDateFieldHarness />);

    const input = screen.getByLabelText("Effective from");
    await user.clear(input);
    await user.type(input, "not-a-date");
    await user.tab();

    expect(input).toHaveValue("not-a-date");
  });

  it("blurring an empty field is a no-op", async () => {
    const user = userEvent.setup();
    render(<UsDateFieldHarness optional />);

    const input = screen.getByLabelText("Effective from (optional)");
    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue("");
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

  it("treats a null/undefined stored value as an empty display value", () => {
    function NullValueHarness() {
      const { control } = useForm<FormValues>({ defaultValues: { effectiveFrom: null } });
      return <UsDateField control={control} name="effectiveFrom" label="Effective from" optional />;
    }

    render(<NullValueHarness />);
    expect(screen.getByLabelText("Effective from (optional)")).toHaveValue("");
  });

  it("blocks submit with the required message when non-optional and empty", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <SubmittableHarness
        defaultValue=""
        requiredMessage="Effective from is required"
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Effective from is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows submit when optional and the stored value is null (not just an empty string)", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<SubmittableHarness defaultValue={null} optional onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith({ effectiveFrom: null }, expect.anything());
  });

  it("blurring a null-valued field is a no-op", async () => {
    const user = userEvent.setup();

    function NullValueHarness() {
      const { control } = useForm<FormValues>({ defaultValues: { effectiveFrom: null } });
      return <UsDateField control={control} name="effectiveFrom" label="Effective from" optional />;
    }

    render(<NullValueHarness />);
    const input = screen.getByLabelText("Effective from (optional)");
    input.focus();
    await user.tab();

    expect(input).toHaveValue("");
  });

  it("allows submit when optional and empty", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<SubmittableHarness defaultValue="" optional onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith({ effectiveFrom: "" }, expect.anything());
  });

  it("blocks submit with a format error when the value can't be parsed", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<SubmittableHarness defaultValue="garbage" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Use MM/DD/YYYY format")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid ISO value unchanged", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<SubmittableHarness defaultValue="2026-06-01" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith({ effectiveFrom: "2026-06-01" }, expect.anything());
  });
});
