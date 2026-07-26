import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu/SelectMenu";

const OPTIONS: SelectMenuOption[] = [
  { value: "cs", label: "Computer Science" },
  { value: "econ", label: "Economics" },
  { value: "bio", label: "Biology" },
];

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <SelectMenu
      label="Major"
      value={value}
      onChange={setValue}
      options={OPTIONS}
      placeholder="Select a major"
      searchPlaceholder="Search majors…"
      disabled={disabled}
    />
  );
}

const combo = () => screen.getByRole("combobox", { name: "Major" });

describe("SelectMenu", () => {
  it("renders a labelled, collapsed combobox showing the placeholder", () => {
    render(<Harness />);
    expect(combo()).toHaveAttribute("placeholder", "Select a major");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on click and lists every option", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    expect(combo()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("type-to-filters the options in the same box (no separate search input)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.type(combo(), "eco");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Economics" })).toBeInTheDocument();
  });

  it("shows 'No matches.' when the filter excludes everything", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.type(combo(), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("selecting an option sets the value and collapses", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.click(screen.getByRole("option", { name: "Biology" }));
    expect(combo()).toHaveValue("Biology");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
  });

  it("keyboard: ArrowDown moves the active option and Enter chooses it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.keyboard("{ArrowDown}{Enter}"); // active 0 → 1 (Economics)
    expect(combo()).toHaveValue("Economics");
  });

  it("keyboard: ArrowUp moves the active option back up", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    // 0 → 1 → 2 (Biology), then back up to 1 (Economics); Enter chooses the active one.
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");
    expect(combo()).toHaveValue("Economics");
  });

  it("keyboard: ArrowDown reopens the menu after Escape closed it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.keyboard("{Escape}"); // close (input keeps focus)
    expect(combo()).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowDown}"); // closed → ArrowDown reopens
    expect(combo()).toHaveAttribute("aria-expanded", "true");
  });

  it("typing reopens the menu after Escape closed it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.keyboard("{Escape}");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
    // Fire change directly (not user.type) so onFocus doesn't re-open first — the onChange itself
    // must reopen the closed menu (the `if (!open) openMenu()` branch) and filter.
    fireEvent.change(combo(), { target: { value: "eco" } });
    expect(combo()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "Economics" })).toBeInTheDocument();
  });

  it("falls back to default placeholders when none are provided", async () => {
    const user = userEvent.setup();
    function Bare() {
      const [value, setValue] = useState("");
      return <SelectMenu label="Major" value={value} onChange={setValue} options={OPTIONS} />;
    }
    render(<Bare />);
    const c = screen.getByRole("combobox", { name: "Major" });
    expect(c).toHaveAttribute("placeholder", "Select…"); // collapsed default
    await user.click(c);
    expect(c).toHaveAttribute("placeholder", "Search…"); // open (search) default
  });

  it("Escape closes without choosing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combo());
    await user.keyboard("{Escape}");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
    expect(combo()).toHaveValue("");
  });

  it("is disabled when told to be", () => {
    render(<Harness disabled />);
    expect(combo()).toBeDisabled();
  });

  it("clicking the label does not open the dropdown", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Major"));
    expect(combo()).toHaveAttribute("aria-expanded", "false");
  });
});
