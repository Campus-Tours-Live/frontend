import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List } from "@/components/ui/list/List";
import { ListItem } from "@/components/ui/list/ListItem";

describe("List", () => {
  it("renders a role=list ul, wraps each child in an li, and divides between rows", () => {
    const { container } = render(
      <List aria-label="Animals" data-testid="animals">
        <ListItem>Dog</ListItem>
        <ListItem>Cat</ListItem>
        <ListItem>Mouse</ListItem>
      </List>,
    );
    const list = screen.getByRole("list", { name: "Animals" });
    expect(list).toHaveAttribute("data-testid", "animals");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    // 3 rows → 2 dividers between them (decorative, aria-hidden).
    expect(container.querySelectorAll("[aria-hidden].border-t")).toHaveLength(2);
  });

  it("can drop the dividers", () => {
    const { container } = render(
      <List dividers={false} aria-label="Plain">
        <ListItem>Dog</ListItem>
        <ListItem>Cat</ListItem>
      </List>,
    );
    expect(container.querySelectorAll(".border-t")).toHaveLength(0);
  });

  it("falls back to the array index as the key for a non-element child", () => {
    // Plain strings aren't valid elements, so List can't key off `.key` — it must fall back to
    // the array index without throwing, and still wrap each one in its own <li>.
    render(<List aria-label="Strings">{["Dog", "Cat"]}</List>);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Dog");
    expect(items[1]).toHaveTextContent("Cat");
  });

  it("skips falsy children so a hidden conditional row renders no empty li", () => {
    const show = false;
    render(
      <List dividers={false} aria-label="Conditional">
        <ListItem>Dog</ListItem>
        <ListItem>Cat</ListItem>
        {show ? <ListItem>Ghost</ListItem> : null}
      </List>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items.every((li) => li.textContent !== "")).toBe(true);
  });
});

describe("ListItem", () => {
  it("lays out leading, an optional title over the label, and trailing", () => {
    render(
      <ListItem
        data-testid="row"
        leading={<span data-testid="lead">L</span>}
        title="Vehicle"
        trailing={<button type="button">Edit</button>}
      >
        2020 Toyota
      </ListItem>,
    );
    const row = screen.getByTestId("row");
    expect(row.tagName).toBe("DIV");
    expect(within(row).getByTestId("lead")).toBeInTheDocument();
    expect(within(row).getByText("Vehicle")).toBeInTheDocument();
    expect(within(row).getByText("2020 Toyota")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("drops its row insets (including the sm: step) when padded={false}", () => {
    const { rerender } = render(<ListItem data-testid="row">Flush</ListItem>);
    // Default: standard setting-row insets.
    expect(screen.getByTestId("row")).toHaveClass("px-5", "py-3.5", "sm:px-6");
    rerender(
      <ListItem data-testid="row" padded={false}>
        Flush
      </ListItem>,
    );
    const row = screen.getByTestId("row");
    expect(row).not.toHaveClass("px-5", "py-3.5", "sm:px-6");
  });

  it("uses full-ink text for the label when there is no title above it", () => {
    render(<ListItem>Just a label</ListItem>);
    expect(screen.getByText("Just a label")).toHaveClass("text-ink");
  });

  it("mutes the label's colour when a title sits above it", () => {
    render(<ListItem title="Vehicle">2020 Toyota</ListItem>);
    expect(screen.getByText("2020 Toyota")).toHaveClass("text-ink-soft");
  });

  it("renders no body line when there are no children (title only)", () => {
    render(<ListItem title="Vehicle" data-testid="row" />);
    const titleEl = screen.getByText("Vehicle");
    // The title's Body is the only child of the content wrapper — no second Body for a
    // missing label line.
    expect(titleEl.parentElement?.children).toHaveLength(1);
  });

  it("passes through onClick / data-* attributes", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <ListItem data-testid="row" onClick={onClick} data-dca-id="B:DE34073B1A">
        Clickable
      </ListItem>,
    );
    const row = screen.getByTestId("row");
    expect(row).toHaveAttribute("data-dca-id", "B:DE34073B1A");
    await user.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
