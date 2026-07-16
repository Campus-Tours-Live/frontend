import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "@/components/ui/actions/IconButton";
import { Icon } from "@/components/ui/icon/Icon";

describe("IconButton", () => {
  it("exposes a11yLabel as the button's accessible name", () => {
    render(
      <IconButton a11yLabel="More options">
        <Icon name="more" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("defaults to type=button and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <IconButton a11yLabel="Close" onClick={onClick}>
        <Icon name="close" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveAttribute("type", "button");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards ref and passes through data-* / id attributes", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton a11yLabel="Info" ref={ref} id="info-btn" data-dca-id="B:123">
        <Icon name="info" />
      </IconButton>,
    );
    expect(ref.current).toBe(screen.getByRole("button", { name: "Info" }));
    expect(ref.current).toHaveAttribute("id", "info-btn");
    expect(ref.current).toHaveAttribute("data-dca-id", "B:123");
  });

  it("is disabled when `disabled` is set", () => {
    render(
      <IconButton a11yLabel="Edit" disabled>
        <Icon name="edit" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  });

  it("renders an anchor when given href, with tab-nabbing-safe rel for target=_blank", () => {
    render(
      <IconButton a11yLabel="Help" href="https://example.com" target="_blank">
        <Icon name="info" />
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Help" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
