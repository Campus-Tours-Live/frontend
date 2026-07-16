import { render, screen } from "@testing-library/react";
import { Grid } from "@/components/ui/layout/Grid";
import { GridColumn } from "@/components/ui/layout/GridColumn";

describe("Grid / GridColumn", () => {
  it("renders a 12-column grid and adds a gutter when asked", () => {
    const { rerender } = render(
      <Grid data-testid="grid">
        <GridColumn>A</GridColumn>
      </Grid>,
    );
    expect(screen.getByTestId("grid")).toHaveClass("grid", "grid-cols-12");
    expect(screen.getByTestId("grid")).not.toHaveClass("gap-4");

    rerender(
      <Grid data-testid="grid" hasGutter>
        <GridColumn>A</GridColumn>
      </Grid>,
    );
    expect(screen.getByTestId("grid")).toHaveClass("gap-4");
  });

  it("defaults a column to full width and maps responsive spans to col-span classes", () => {
    render(
      <Grid>
        <GridColumn data-testid="full">A</GridColumn>
        <GridColumn data-testid="responsive" sm={12} md={6} lg={4} xl={3} xxl={2}>
          B
        </GridColumn>
      </Grid>,
    );
    expect(screen.getByTestId("full")).toHaveClass("col-span-12");
    expect(screen.getByTestId("responsive")).toHaveClass(
      "col-span-12",
      "md:col-span-6",
      "lg:col-span-4",
      "xl:col-span-3",
      "2xl:col-span-2",
    );
  });
});
