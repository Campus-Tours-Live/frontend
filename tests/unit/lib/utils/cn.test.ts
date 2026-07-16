import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("merges plain string arguments with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("returns an empty string when given nothing", () => {
    expect(cn()).toBe("");
  });

  it("drops falsy inputs (undefined, null, false, empty string)", () => {
    expect(cn("a", undefined, null, false, "", "b")).toBe("a b");
  });

  it("supports conditional object syntax (clsx)", () => {
    expect(cn({ active: true, disabled: false, visible: true })).toBe("active visible");
  });

  it("flattens array inputs (clsx)", () => {
    expect(cn(["a", "b"], ["c"])).toBe("a b c");
  });

  it("supports nested arrays and objects mixed together", () => {
    expect(cn("base", ["x", { y: true, z: false }], { w: true })).toBe("base x y w");
  });

  it("resolves conflicting Tailwind utilities, keeping the last (tailwind-merge)", () => {
    // The doc comment promises cn("p-[18px]", "p-0") → "p-0".
    expect(cn("p-[18px]", "p-0")).toBe("p-0");
  });

  it("lets a passed-in className override a component default for the same property", () => {
    expect(cn("px-2 py-1 text-sm", "px-4")).toBe("py-1 text-sm px-4");
  });

  it("keeps non-conflicting Tailwind utilities side by side", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
  });

  it("resolves conflicts that arrive via conditional objects", () => {
    expect(cn("text-red-500", { "text-blue-500": true })).toBe("text-blue-500");
  });

  it("deduplicates / collapses repeated conflicting classes across many args", () => {
    expect(cn("block", "hidden", "block")).toBe("block");
  });

  it("treats the custom ui-sm/ui/ui-lg font-size tokens as one font-size group", () => {
    // Registered via extendTailwindMerge (must mirror tailwind.config fontSize keys). Same group →
    // last wins; a wrong/missing registration would emit both, breaking size dedup.
    expect(cn("text-ui", "text-ui-lg")).toBe("text-ui-lg");
    expect(cn("text-ui-lg", "text-ui-sm")).toBe("text-ui-sm");
    // …but a font-size and a text-colour are different groups and must coexist.
    expect(cn("text-ui", "text-ink-soft")).toBe("text-ui text-ink-soft");
  });
});
