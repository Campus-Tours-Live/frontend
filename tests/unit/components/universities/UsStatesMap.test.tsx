import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsStatesMap } from "@/components/universities/UsStatesMap";
import { US_STATES } from "@/components/universities/us-states.generated";

describe("us-states data", () => {
  it("carries the 50 states plus DC, each with a unique code", () => {
    expect(US_STATES).toHaveLength(51);
    expect(new Set(US_STATES.map((s) => s.code)).size).toBe(51);
    expect(US_STATES.find((s) => s.code === "DC")?.name).toBe("District of Columbia");
  });

  it("excludes the territories", () => {
    for (const code of ["PR", "GU", "VI", "AS", "MP"]) {
      expect(US_STATES.find((s) => s.code === code)).toBeUndefined();
    }
  });

  it("gives every state usable geometry and a centroid", () => {
    for (const s of US_STATES) {
      expect(s.d.startsWith("M")).toBe(true);
      expect(Number.isFinite(s.cx) && Number.isFinite(s.cy)).toBe(true);
    }
  });

  /**
   * The shapes people notice first if the geometry is wrong or over-simplified. Each of these is
   * multi-part, so it shows up as more than one subpath.
   */
  it("keeps the multi-part states multi-part", () => {
    const subpaths = (code: string) =>
      (US_STATES.find((s) => s.code === code)!.d.match(/M/g) ?? []).length;

    expect(subpaths("MI")).toBeGreaterThan(1); // Upper + Lower Peninsula
    expect(subpaths("HI")).toBeGreaterThan(3); // several islands, not one dot
    expect(subpaths("NY")).toBeGreaterThan(1); // Long Island
  });

  it("puts Alaska and Hawaii in their own insets", () => {
    expect(US_STATES.find((s) => s.code === "AK")!.inset).toBe("alaska");
    expect(US_STATES.find((s) => s.code === "HI")!.inset).toBe("hawaii");
    expect(US_STATES.filter((s) => s.inset === "contiguous")).toHaveLength(49); // 48 + DC
  });
});

describe("UsStatesMap", () => {
  it("renders exactly one focusable control per entry", () => {
    render(<UsStatesMap />);
    expect(screen.getAllByRole("button")).toHaveLength(51);
    expect(screen.getByRole("button", { name: "Michigan" })).toBeInTheDocument();
  });

  /**
   * DC projects to about 4×5 px — unpointable between the Maryland and Virginia that surround it.
   * A disc at its centroid widens where the pointer finds it, but paints NOTHING: the boundary
   * shown is DC's real Census outline, like every other entry. A visible dot would make this the
   * one place on the map where the border drawn is not the real border.
   *
   * What must not happen is BOTH answering as buttons, which would put two controls on one place.
   */
  describe("District of Columbia", () => {
    const dcShape = (container: HTMLElement) => container.querySelector("#state-DC");

    it("is reachable through a disc, not its own outline", () => {
      render(<UsStatesMap />);

      const control = screen.getByRole("button", { name: "District of Columbia" });
      expect(control.tagName.toLowerCase()).toBe("circle");
      expect(Number(control.getAttribute("r"))).toBeGreaterThan(4);
    });

    /**
     * The regression guard for "DC is a dot": the disc must draw nothing. `fill-transparent` is
     * load-bearing and not the same as no fill — `fill: none` is not hit-tested, so the disc would
     * catch nothing and DC would go back to being unhoverable.
     */
    it("draws nothing — the disc is a hit target, not a marker", () => {
      render(<UsStatesMap />);
      const control = screen.getByRole("button", { name: "District of Columbia" });

      expect(control.classList.contains("fill-transparent")).toBe(true);
      ["fill-border", "fill-sage", "fill-primary", "fill-card"].forEach((c) =>
        expect(control.classList.contains(c)).toBe(false),
      );
      // No resting stroke either — the only one it ever has is the keyboard focus ring.
      expect(control.getAttribute("class")).not.toMatch(/(^|\s)stroke-/);
    });

    it("still draws its real outline, but not as a second control", () => {
      const { container } = render(<UsStatesMap />);
      const shape = dcShape(container)!;

      expect(shape.getAttribute("d")).toMatch(/^M/);
      expect(shape).not.toHaveAttribute("role");
      expect(shape).toHaveAttribute("aria-hidden", "true");
      expect(shape).toHaveAttribute("pointer-events", "none");
    });

    /**
     * …and that outline still carries the state's colours, since the disc carries none. Selection
     * has to land on the real shape or DC would be the one entry that cannot look selected.
     */
    it("shows selection on its outline, where the geography is", () => {
      const { container } = render(<UsStatesMap selectedCode="DC" />);
      expect(dcShape(container)!.classList.contains("fill-primary")).toBe(true);
    });

    it("selects like any other entry", async () => {
      const onSelect = jest.fn();
      render(<UsStatesMap onSelect={onSelect} />);

      await userEvent.click(screen.getByRole("button", { name: "District of Columbia" }));

      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: "DC" }));
    });

    /** Every other entry keeps its outline as the control — the disc is for the tiny ones only. */
    it("does not turn ordinary states into discs", () => {
      render(<UsStatesMap />);
      expect(screen.getByRole("button", { name: "Rhode Island" }).tagName.toLowerCase()).toBe(
        "path",
      );
    });
  });

  it("reports the chosen state on click", async () => {
    const onSelect = jest.fn();
    render(<UsStatesMap onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: "California" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: "CA" }));
  });

  /**
   * A <path> is not a native button, so Enter and Space only work because they are wired by hand.
   * Without this the `role="button"` would be a lie to anyone not using a mouse.
   */
  it.each(["{Enter}", " "])("activates with the %s key", async (key) => {
    const onSelect = jest.fn();
    render(<UsStatesMap onSelect={onSelect} />);

    screen.getByRole("button", { name: "Texas" }).focus();
    await userEvent.keyboard(key);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: "TX" }));
  });

  it("marks the selected state as pressed", () => {
    render(<UsStatesMap selectedCode="OR" />);
    expect(screen.getByRole("button", { name: "Oregon" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Nevada" })).not.toHaveAttribute("aria-pressed");
  });

  it("does not report disabled states, and takes them out of the tab order", async () => {
    const onSelect = jest.fn();
    render(<UsStatesMap disabledCodes={["WY"]} onSelect={onSelect} />);

    const wyoming = screen.getByRole("button", { name: "Wyoming" });
    expect(wyoming).toHaveAttribute("aria-disabled", "true");
    expect(wyoming).toHaveAttribute("tabindex", "-1");

    await userEvent.click(wyoming);
    expect(onSelect).not.toHaveBeenCalled();
  });

  const lifted = (container: HTMLElement) => container.querySelector("g.state-lift");
  const flagImage = (container: HTMLElement) => container.querySelector("g.state-lift image");

  /**
   * The lift is the cue for which state is under the pointer, and the only one a keyboard user
   * gets, so it has to follow focus as well as hover.
   */
  it("lifts the state under the pointer, and drops it on leave", () => {
    const { container } = render(<UsStatesMap />);
    const florida = screen.getByRole("button", { name: "Florida" });

    expect(lifted(container)).toBeNull();
    fireEvent.mouseEnter(florida);
    expect(lifted(container)).not.toBeNull();
    fireEvent.mouseLeave(florida);
    expect(lifted(container)).toBeNull();
  });

  it("lifts on keyboard focus too", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.focus(screen.getByRole("button", { name: "Maine" }));
    expect(lifted(container)).not.toBeNull();
  });

  /** The raised copy must not take the hover, or crossing onto it would drop the state again. */
  it("keeps the raised copy out of hit testing", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Utah" }));

    expect(lifted(container)!.closest("g[pointer-events]")).toHaveAttribute(
      "pointer-events",
      "none",
    );
  });

  it("fills the lifted state with that state's flag, clipped to its outline", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Texas" }));

    const flag = flagImage(container)!;
    const href = flag.getAttribute("href")!;
    // Routed through Next's optimizer — the originals are ~2 MB PNGs, which would be handed to the
    // browser whole on every hover otherwise.
    expect(href.startsWith("/_next/image?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("/Texas.png");
    expect(flag.getAttribute("clip-path")).toBe("url(#clip-TX)");
  });

  /** Multi-word names are underscored in the bucket: `New_Hampshire.png`. */
  it("resolves multi-word state names to their underscored file", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "New Hampshire" }));

    expect(decodeURIComponent(flagImage(container)!.getAttribute("href")!)).toContain(
      "/New_Hampshire.png",
    );
  });

  it("resolves the District of Columbia to its own flag file", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "District of Columbia" }));

    expect(decodeURIComponent(flagImage(container)!.getAttribute("href")!)).toContain(
      "/District_of_Columbia.png",
    );
  });

  /**
   * The fallback is what lets the 50 flags arrive one at a time: a state with no flag yet still
   * lifts and reads, with no manifest to keep in sync and no code change when the next file lands.
   */
  it("still lifts a state whose flag is missing", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Ohio" }));

    fireEvent.error(flagImage(container)!);

    expect(flagImage(container)).toBeNull();
    expect(lifted(container)).not.toBeNull();
  });

  it("remembers a missing flag instead of re-requesting it every hover", () => {
    const { container } = render(<UsStatesMap />);
    const ohio = screen.getByRole("button", { name: "Ohio" });

    fireEvent.mouseEnter(ohio);
    fireEvent.error(flagImage(container)!);
    fireEvent.mouseLeave(ohio);
    fireEvent.mouseEnter(ohio);

    expect(flagImage(container)).toBeNull();
    expect(lifted(container)).not.toBeNull();
  });

  /**
   * A flat multiplier is the wrong rule for a set whose members differ by two orders of magnitude:
   * the same 1.6 that makes Texas a landmark leaves the District of Columbia (4×5 units) a slightly
   * larger speck, with no outline to read and no room for a flag. The multiplier is a floor.
   */
  it("grows a tiny state far enough to read, rather than by the same multiplier", () => {
    const { container } = render(<UsStatesMap />);
    const scaleOf = () =>
      Number(/scale\(([\d.]+)\)/.exec((lifted(container) as SVGGElement).style.transform)![1]);

    const texas = screen.getByRole("button", { name: "Texas" });
    fireEvent.mouseEnter(texas);
    const texasScale = scaleOf();
    fireEvent.mouseLeave(texas);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "District of Columbia" }));
    const dcScale = scaleOf();

    expect(texasScale).toBeCloseTo(1.6);
    expect(dcScale).toBeGreaterThan(texasScale * 4);

    // …and the point of the bigger multiplier: DC ends up a shape you can actually see. 40 viewBox
    // units is roughly Vermont's footprint on the map, against DC's own 5.
    const dc = US_STATES.find((s) => s.code === "DC")!;
    const longest = Math.max(dc.bbox[2] - dc.bbox[0], dc.bbox[3] - dc.bbox[1]);
    expect(longest).toBeLessThan(10); // the premise: it is unreadable at rest
    expect(dcScale * longest).toBeGreaterThan(40);
  });
});

describe("UsStatesMap — the country recedes behind a raised state", () => {
  const baseLayer = (container: HTMLElement) =>
    container.querySelector("svg > g.transition-opacity") as SVGGElement;

  /**
   * The raised state is meant to read as ABOVE the country, not merely recoloured within it, so the
   * base layer fades while one is up. Dimming the layer rather than each of the 51 shapes is also
   * what stops the borders flickering as the pointer crosses between them.
   */
  it("dims the whole base map while a state is raised, and restores it after", () => {
    const { container } = render(<UsStatesMap />);
    const base = baseLayer(container);
    const texas = screen.getByRole("button", { name: "Texas" });

    expect(base.style.opacity).toBe("1");

    fireEvent.mouseEnter(texas);
    expect(Number(base.style.opacity)).toBeLessThan(1);
    expect(Number(base.style.opacity)).toBeGreaterThan(0); // receding, not blanked

    fireEvent.mouseLeave(texas);
    expect(base.style.opacity).toBe("1");
  });

  it("restores the base map when focus moves away, not just the pointer", () => {
    const { container } = render(<UsStatesMap />);
    const base = baseLayer(container);
    const utah = screen.getByRole("button", { name: "Utah" });

    fireEvent.focus(utah);
    expect(Number(base.style.opacity)).toBeLessThan(1);

    fireEvent.blur(utah);
    expect(base.style.opacity).toBe("1");
  });

  /**
   * The raised state is LIFTED OUT of the country, not highlighted inside it: its shape in the base
   * map is drawn in the card's own colour so nothing of it remains underneath.
   *
   * This is load-bearing, not cosmetic. Enlarging a shape about a single point cannot cover the
   * original unless the shape is convex, and several are not — Florida's bounding-box centre falls
   * in the Gulf between the panhandle and the peninsula, and Hawaii is eight islands that a scale
   * pushes apart. Any fill left underneath surfaces beside the raised copy as a ghost of the state,
   * which reads as the map having jumped. The rule is uniform across all 51 shapes, so it is
   * checked on an L-shape, an archipelago and an ordinary blob alike.
   */
  it.each(["Florida", "Hawaii", "Ohio", "Alaska"])(
    "takes %s out of the base map while it is raised, leaving nothing underneath",
    (name) => {
      render(<UsStatesMap />);
      const shape = screen.getByRole("button", { name });

      expect(shape.classList.contains("fill-border")).toBe(true);

      fireEvent.mouseEnter(shape);
      expect(shape.classList.contains("fill-card")).toBe(true);
      expect(shape.classList.contains("fill-border")).toBe(false);
      expect(shape.classList.contains("fill-sage")).toBe(false);

      fireEvent.mouseLeave(shape);
      expect(shape.classList.contains("fill-border")).toBe(true);
    },
  );

  /** A selected state is taken out too — the raised copy is the state while the pointer is on it. */
  it("takes the selected state out of the base map as well", () => {
    render(<UsStatesMap selectedCode="TX" />);
    const texas = screen.getByRole("button", { name: "Texas" });

    expect(texas.classList.contains("fill-primary")).toBe(true);

    fireEvent.mouseEnter(texas);
    expect(texas.classList.contains("fill-card")).toBe(true);
    expect(texas.classList.contains("fill-primary")).toBe(false);
  });

  /** The raised copy sits outside the dimmed layer, or it would fade along with everything else. */
  it("keeps the raised state out of the dimmed layer", () => {
    const { container } = render(<UsStatesMap />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Florida" }));

    const raised = container.querySelector("g.state-lift")!;
    expect(baseLayer(container).contains(raised)).toBe(false);
  });
});

describe("UsStatesMap — paint order for the tiny-state rings", () => {
  /**
   * SVG has no z-index: later elements paint over earlier ones. The data is ordered by USPS code,
   * which puts DC eighth — before the Maryland and Virginia that surround it — so a ring drawn
   * inline with the states was painted over by both and could not be hovered at all. This is the
   * regression guard for that: the ring must come after every state path in document order.
   */
  it("draws the DC ring after the states that surround it", () => {
    const { container } = render(<UsStatesMap />);
    const svg = container.querySelector("svg")!;
    const all = Array.from(svg.querySelectorAll("path[id^='state-'], circle[aria-label]"));

    const idx = (sel: string) => all.findIndex((el) => el.matches(sel));
    const ring = idx('circle[aria-label="District of Columbia"]');
    const maryland = idx("#state-MD");
    const virginia = idx("#state-VA");

    expect(ring).toBeGreaterThan(-1);
    expect(ring).toBeGreaterThan(maryland);
    expect(ring).toBeGreaterThan(virginia);
  });

  /** …and after the very last state, so nothing added later can bury it again. */
  it("draws the ring above every state path", () => {
    const { container } = render(<UsStatesMap />);
    const svg = container.querySelector("svg")!;
    const nodes = Array.from(svg.querySelectorAll("path[id^='state-'], circle[aria-label]"));
    const lastStatePath = nodes.map((n) => n.matches("path[id^='state-']")).lastIndexOf(true);
    const ring = nodes.findIndex((n) => n.matches('circle[aria-label="District of Columbia"]'));

    expect(ring).toBeGreaterThan(lastStatePath);
  });
});
