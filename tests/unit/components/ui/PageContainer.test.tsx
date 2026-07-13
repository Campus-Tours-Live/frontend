import { render, screen } from "@testing-library/react";
import { PageContainer } from "@/components/ui";

describe("PageContainer", () => {
  it("renders children with the shared vertical rhythm", () => {
    render(
      <PageContainer>
        <p>Body</p>
      </PageContainer>,
    );
    const wrapper = screen.getByText("Body").parentElement as HTMLElement;
    expect(wrapper).toHaveClass("space-y-8");
  });

  it("caps the width at 960px for the default prose width", () => {
    render(
      <PageContainer>
        <p>Body</p>
      </PageContainer>,
    );
    const wrapper = screen.getByText("Body").parentElement as HTMLElement;
    expect(wrapper).toHaveClass("mx-auto", "max-w-[960px]");
  });

  it('fills the column (no max-width) for width="wide"', () => {
    render(
      <PageContainer width="wide">
        <p>Body</p>
      </PageContainer>,
    );
    const wrapper = screen.getByText("Body").parentElement as HTMLElement;
    expect(wrapper).not.toHaveClass("max-w-[960px]");
    expect(wrapper).toHaveClass("space-y-8");
  });

  it("merges extra className", () => {
    render(
      <PageContainer className="pt-2">
        <p>Body</p>
      </PageContainer>,
    );
    expect(screen.getByText("Body").parentElement).toHaveClass("pt-2");
  });
});
