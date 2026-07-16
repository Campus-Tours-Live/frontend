import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List, ListItem } from "@/components/ui/List";

describe("List", () => {
  it("renders a role=list <ul> with dividers by default and spreads attributes", () => {
    render(
      <List aria-label="Vehicles" data-testid="vehicleList">
        <ListItem>A</ListItem>
        <ListItem>B</ListItem>
      </List>,
    );
    const list = screen.getByRole("list", { name: "Vehicles" });
    expect(list).toHaveAttribute("data-testid", "vehicleList");
    expect(list).toHaveClass("divide-y", "divide-border");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("can drop the dividers", () => {
    render(
      <List dividers={false} aria-label="Plain">
        <ListItem>A</ListItem>
      </List>,
    );
    expect(screen.getByRole("list", { name: "Plain" })).not.toHaveClass("divide-y");
  });
});

describe("ListItem", () => {
  it("lays out leading, children, and trailing", () => {
    render(
      <ul>
        <ListItem
          data-testid="row"
          leading={<span data-testid="lead">L</span>}
          trailing={<button type="button">Edit</button>}
        >
          Main content
        </ListItem>
      </ul>,
    );
    const row = screen.getByTestId("row");
    expect(row.tagName).toBe("LI");
    expect(within(row).getByTestId("lead")).toBeInTheDocument();
    expect(within(row).getByText("Main content")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("passes through onClick / data-* attributes", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <ul>
        <ListItem onClick={onClick} data-dca-id="B:DE34073B1A">
          Clickable
        </ListItem>
      </ul>,
    );
    const row = screen.getByText("Clickable").closest("li")!;
    expect(row).toHaveAttribute("data-dca-id", "B:DE34073B1A");
    await user.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
