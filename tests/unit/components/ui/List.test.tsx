import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List } from "@/components/ui/List";
import { ListItem } from "@/components/ui/ListItem";

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
