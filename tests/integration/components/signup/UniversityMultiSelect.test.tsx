import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  UniversityMultiSelect,
  type UniversityOption,
} from "@/components/signup/UniversityMultiSelect";

// Mock the data-access search hook (the network boundary). We capture the query
// + enabled flag the component passes, and return controlled options. The real
// debounce lives inside the hook, so mocking it keeps assertions synchronous.
const search = jest.fn();
jest.mock("@/lib/data-access", () => ({
  useUniversitySearch: (query: string, opts?: { enabled?: boolean }) => search(query, opts),
}));

const OPTIONS: UniversityOption[] = [
  { id: "u-1", name: "State University", shortName: "State", city: "Austin", region: "TX" },
  { id: "u-2", name: "City College", shortName: "City", city: "Boston", region: "MA" },
];

/** Hook returns options only when there's a query and search is enabled. */
function defaultSearchImpl(query: string, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  return {
    data: enabled && query ? OPTIONS : [],
    isFetching: false,
  };
}

/** Controlled host so onChange actually updates `value` (real chip/cap behaviour). */
function Harness({ max }: { max?: number }) {
  const [value, setValue] = useState<UniversityOption[]>([]);
  return <UniversityMultiSelect value={value} onChange={setValue} max={max} />;
}

beforeEach(() => {
  search.mockReset();
  search.mockImplementation(defaultSearchImpl);
});

describe("UniversityMultiSelect", () => {
  it("associates a wrapping label via the id prop (a11y)", () => {
    render(
      <>
        <label htmlFor="uni-x">Your university</label>
        <UniversityMultiSelect id="uni-x" value={[]} onChange={() => {}} max={1} />
      </>,
    );
    // The label's htmlFor resolves to the search input, so it's programmatically labelled.
    expect(screen.getByLabelText("Your university")).toBe(
      screen.getByPlaceholderText(/search universities/i),
    );
  });

  it("searches as you type and renders matching options", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText(/search universities/i);
    await user.type(input, "uni");

    // The hook received the typed query (search is driven by the component).
    expect(search).toHaveBeenLastCalledWith("uni", expect.objectContaining({ enabled: true }));
    // Options from the mocked hook render in the dropdown.
    expect(await screen.findByRole("button", { name: /State University/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /City College/i })).toBeInTheDocument();
  });

  it("selecting an option adds a removable chip and clears the query", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    // Chip shows (shortName preferred) with a remove control.
    expect(screen.getByRole("button", { name: /Remove State University/i })).toBeInTheDocument();
    // Query reset after selection.
    expect(screen.getByPlaceholderText(/search universities/i)).toHaveValue("");
    // Already-selected option is filtered out of subsequent results.
    expect(screen.queryByRole("button", { name: /^State University$/i })).not.toBeInTheDocument();
  });

  it("removing a selection drops the chip", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByPlaceholderText(/search universities/i), "city");
    await user.click(await screen.findByRole("button", { name: /City College/i }));
    expect(screen.getByRole("button", { name: /Remove City College/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remove City College/i }));
    expect(screen.queryByRole("button", { name: /Remove City College/i })).not.toBeInTheDocument();
  });

  it("shows a live count and the 'remove one' hint once the max is reached", async () => {
    const user = userEvent.setup();
    render(<Harness max={2} />);

    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));
    // Below max → count reflects progress, no "remove one" hint yet.
    expect(screen.getByText(/1 of 2 selected/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search universities/i), "city");
    await user.click(await screen.findByRole("button", { name: /City College/i }));
    // At max → the search input is gone and the count gains the "remove one to add another" hint.
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/search universities/i)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/2 of 2 selected · remove one to add another/i)).toBeInTheDocument();
  });

  it("falls back to the full name when an option has no shortName", async () => {
    const user = userEvent.setup();
    search.mockImplementation((query: string, opts?: { enabled?: boolean }) => ({
      data:
        (opts?.enabled ?? true) && query
          ? [{ id: "u-9", name: "Nameless University", city: "Reno", region: "NV" }]
          : [],
      isFetching: false,
    }));
    render(<Harness />);

    await user.type(screen.getByPlaceholderText(/search universities/i), "name");
    await user.click(await screen.findByRole("button", { name: /Nameless University/i }));

    // No shortName → the chip shows the full name.
    const chip = screen.getByRole("button", { name: /Remove Nameless University/i }).parentElement;
    expect(chip).toHaveTextContent("Nameless University");
  });

  it("renders no options when the search hook returns no data", async () => {
    const user = userEvent.setup();
    search.mockImplementation(() => ({ data: undefined, isFetching: false }));
    render(<Harness />);

    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    expect(screen.queryByRole("button", { name: /university|college/i })).not.toBeInTheDocument();
  });

  it("collapses to a single-select combobox once a school is chosen (max=1)", async () => {
    const user = userEvent.setup();
    render(<Harness max={1} />);

    // Empty single-select shows just the search field — no multi-select caption.
    expect(screen.queryByText(/pick up to 1/i)).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    // Selected → combobox value row: the school name shows, the search input is gone,
    // and there is no "maximum" caption or removable chip.
    expect(screen.getByText("State University")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search universities/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/maximum 1 selected/i)).not.toBeInTheDocument();

    // The search hook was last called with enabled:false (gated at max).
    expect(search).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );

    // "Change university" clears the selection → the search input returns AND is auto-focused, so
    // the user can retype without a second click.
    await user.click(screen.getByRole("button", { name: /change university/i }));
    const reopened = screen.getByPlaceholderText(/search universities/i);
    expect(reopened).toBeInTheDocument();
    expect(reopened).toHaveFocus();
  });
});
