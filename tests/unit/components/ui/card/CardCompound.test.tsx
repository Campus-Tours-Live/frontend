import { render, screen, within } from "@testing-library/react";
import { Card } from "@/components/ui/card/Card";
import { CardMedia } from "@/components/ui/card/CardMedia";
import { CardHeader } from "@/components/ui/card/CardHeader";
import { CardContent } from "@/components/ui/card/CardContent";
import { CardActions } from "@/components/ui/card/CardActions";

describe("Card compound", () => {
  it("composes media, header (leadingIcon/title/trailing), content, and actions", () => {
    render(
      <Card padded={false} className="overflow-hidden" data-testid="card">
        <CardMedia>
          <img alt="Kitten" src="cat.jpg" />
        </CardMedia>
        <CardHeader
          leadingIcon={<span data-testid="lead">i</span>}
          title="Welcome"
          trailing={<button type="button">Start</button>}
        />
        <CardContent>Body copy</CardContent>
        <CardActions>
          <button type="button">Action</button>
        </CardActions>
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(screen.getByRole("img", { name: "Kitten" })).toBeInTheDocument();
    // Header renders the title as a heading, plus leading + trailing.
    expect(within(card).getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(within(card).getByTestId("lead")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(within(card).getByText("Body copy")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("renders no leading/trailing spans when CardHeader gets neither", () => {
    const { container } = render(
      <Card padded={false}>
        <CardHeader title="Just a title" />
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Just a title" })).toBeInTheDocument();
    // Neither optional slot was passed, so their wrapper spans should not be rendered.
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("bumps the title's Heading size to 'large' inside a large Card", () => {
    render(
      <Card padded={false} size="large">
        <CardHeader title="Big header" />
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Big header" })).toHaveClass("text-[20px]");
  });

  it("scales sub-component padding via the Card size context", () => {
    const { rerender } = render(
      <Card padded={false} size="small">
        <CardContent data-testid="content">x</CardContent>
      </Card>,
    );
    expect(screen.getByTestId("content")).toHaveClass("px-5", "py-4");

    rerender(
      <Card padded={false} size="large">
        <CardContent data-testid="content">x</CardContent>
      </Card>,
    );
    expect(screen.getByTestId("content")).toHaveClass("px-6", "py-5");
  });
});
