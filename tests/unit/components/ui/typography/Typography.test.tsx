import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Heading } from "@/components/ui/typography/Heading";
import { Body } from "@/components/ui/typography/Body";
import { Display } from "@/components/ui/typography/Display";

describe("Heading", () => {
  it("renders the semantic tag from `as` (independent of size)", () => {
    render(
      <Heading as="h3" size="large">
        Weekly hours
      </Heading>,
    );
    const el = screen.getByRole("heading", { level: 3, name: "Weekly hours" });
    expect(el.tagName).toBe("H3");
    expect(el).toHaveClass("font-display", "text-[20px]", "font-bold", "text-ink");
  });

  it("maps weight and color tokens to classes", () => {
    render(
      <Heading as="h2" weight={600} color="primary">
        Title
      </Heading>,
    );
    const el = screen.getByRole("heading", { name: "Title" });
    expect(el).toHaveClass("font-semibold", "text-primary");
  });

  it("forwards native attributes (id, aria, onClick) to the element", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Heading as="h2" id="sec" aria-label="Section" onClick={onClick}>
        Title
      </Heading>,
    );
    const el = screen.getByRole("heading", { name: "Section" });
    expect(el).toHaveAttribute("id", "sec");
    await user.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Display", () => {
  it("renders a span by default with display font + large size/ink", () => {
    render(<Display>Hero</Display>);
    const el = screen.getByText("Hero");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("font-display", "text-[40px]", "font-normal", "text-ink");
  });

  it("honours as/size/weight and forwards props", () => {
    render(
      <Display as="h1" size="small" weight={700} data-testid="stat">
        1,204
      </Display>,
    );
    const el = screen.getByRole("heading", { level: 1, name: "1,204" });
    expect(el).toHaveClass("text-[30px]", "font-bold");
    expect(el).toHaveAttribute("data-testid", "stat");
  });
});

describe("Body", () => {
  it("renders a <p> by default with the sans font + size/color tokens", () => {
    render(<Body color="muted">Some copy</Body>);
    const el = screen.getByText("Some copy");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("font-sans", "text-[14px]", "font-normal", "text-ink-soft");
  });

  it("can render as a span", () => {
    render(
      <Body as="span" size="small" weight={700}>
        inline
      </Body>,
    );
    const el = screen.getByText("inline");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("text-[13px]", "font-bold");
  });
});
