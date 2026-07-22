import {
  Glass,
  glassClass,
  GLASS_BASE,
  GLASS_TONE_CLASS,
  ButtonRow,
  CardMedia,
  CardHeader,
  CardContent,
  CardActions,
  Rating,
  RatingStar,
  Select,
  Snack,
  SnackbarProvider,
  SnackbarContext,
  useSnackbar,
  Grid,
  GridColumn,
} from "@/components/ui";

/**
 * These symbols are re-exported from `src/components/ui/index.ts` but, across the whole test
 * suite, every real consumer imports them from their own module directly (e.g. `./glass/Glass`,
 * `./card/CardMedia`) rather than through the `@/components/ui` barrel — so the barrel's
 * re-export bindings never register a hit. This test exists solely to exercise those bindings.
 */
describe("@/components/ui barrel — re-exports with no other barrel consumer", () => {
  it("re-exports Glass, glassClass, GLASS_BASE, and GLASS_TONE_CLASS", () => {
    expect(Glass).toBeDefined();
    expect(glassClass).toBeDefined();
    expect(GLASS_BASE).toBeDefined();
    expect(GLASS_TONE_CLASS).toBeDefined();
  });

  it("re-exports the remaining barrel-only symbols", () => {
    expect(ButtonRow).toBeDefined();
    expect(CardMedia).toBeDefined();
    expect(CardHeader).toBeDefined();
    expect(CardContent).toBeDefined();
    expect(CardActions).toBeDefined();
    expect(Rating).toBeDefined();
    expect(RatingStar).toBeDefined();
    expect(Select).toBeDefined();
    expect(Snack).toBeDefined();
    expect(SnackbarProvider).toBeDefined();
    expect(SnackbarContext).toBeDefined();
    expect(useSnackbar).toBeDefined();
    expect(Grid).toBeDefined();
    expect(GridColumn).toBeDefined();
  });
});
