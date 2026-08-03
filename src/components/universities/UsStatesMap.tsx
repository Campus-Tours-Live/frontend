"use client";

import { useState } from "react";
import { stateFlagUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { US_MAP_VIEWBOX, US_STATES, type UsState } from "./us-states.generated";

/**
 * UsStatesMap — the interactive US map: hover or focus a state to highlight it and raise a pin,
 * activate it to go wherever the caller sends it.
 *
 * SVG rather than canvas or WebGL. There is no 3D here, and a pixel-based renderer would mean
 * rebuilding hit-testing, hover, focus and keyboard traversal by hand while remaining invisible to
 * assistive tech. As 50 `<path>` elements the browser gives all of that for free, it server-renders,
 * and it costs nothing at runtime beyond its own bytes.
 *
 * Geometry comes from `us-states.generated.ts` — US Census boundary data, projected at generation
 * time. Nothing here draws borders.
 *
 * Each state is a real `role="button"` with an accessible name, reachable by Tab and activated by
 * Enter or Space, so the map is fully usable without a pointer — the A–Z index beside it is the
 * shortcut, not the fallback.
 */
export interface UsStatesMapProps {
  className?: string;
  /** Marks a state as current. */
  selectedCode?: string;
  /** States with nothing behind them yet — dimmed and inert. */
  disabledCodes?: readonly string[];
  /**
   * States to light up from outside the map — the A–Z index uses this so hovering a letter shows
   * which states it covers. Rendered exactly like a pointer hover, so the two cues match.
   */
  highlightedCodes?: readonly string[];
  onSelect?: (state: UsState) => void;
}

/**
 * Below this, in viewBox units, a shape is too small to point at — the map renders about 1:1
 * against this viewBox, so these are roughly CSS pixels. Rhode Island (16×23) clears it; the
 * District of Columbia (4×5) does not.
 */
const TINY_THRESHOLD = 10;

/**
 * Radius of the INVISIBLE disc that catches the pointer for a shape too small to hit.
 *
 * It draws nothing: the District of Columbia keeps its own boundary on the map like every other
 * entry, and this only widens where that boundary answers. A visible marker would replace real
 * geography with a dot, and the map's whole claim is that its borders are the real ones.
 *
 * Kept modest because it sits over Maryland and Virginia, which surround DC — every unit of radius
 * is a unit of their outline that stops responding.
 */
const TINY_HIT_RADIUS = 5.5;

/**
 * How far the country recedes while one state is raised. Low enough that the raised state clearly
 * sits above it, high enough that the surrounding shape is still legible — the point is to place
 * the state in its country, not to blank the country out.
 */
const BASE_DIM_OPACITY = 0.6;

/** How much the raised state grows. */
const LIFT_SCALE = 1.6;

/**
 * The smallest a raised state may end up, longest side, in viewBox units.
 *
 * A flat multiplier is the wrong rule for a set whose members differ by two orders of magnitude:
 * 1.6× turns Texas into a landmark and the District of Columbia (4×5) into a slightly larger
 * speck — no outline to read and no room for a flag. So the multiplier is a floor, not a fixed
 * value, and anything that would still be unreadable grows until it is legible instead. Only two
 * entries are affected: DC (8.3×) and Rhode Island (1.9×).
 */
const LIFT_MIN_SIZE = 44;

/** How much THIS state grows — `LIFT_SCALE`, or enough to be readable, whichever is more. */
function liftScale(state: UsState): number {
  const [x0, y0, x1, y1] = state.bbox;
  return Math.max(LIFT_SCALE, LIFT_MIN_SIZE / Math.max(x1 - x0, y1 - y0));
}

/**
 * Margin added AROUND the country so a raised state grows purely in place.
 *
 * The raised copy has to sit exactly on top of the state it came from — anything else reads as the
 * map jumping. That rules out nudging edge states back inside the frame, which is what a
 * clamped transform used to do: Alaska was being pushed 105 units right of its own outline and
 * Texas 49 up, and the shape underneath showed through beside them.
 *
 * So the frame is made big enough that no state ever needs nudging. At `LIFT_SCALE` the worst
 * overhangs are Alaska (78.6 left), Texas (39.5 bottom) and Maine (11.0 right); the padding below
 * covers all of them with room to spare. Left and right are equal so the country still sits
 * centred in the frame, and the top needs nothing — no state's growth reaches it.
 */
const MAP_PAD = { x: 85, top: 6, bottom: 46 } as const;

const VIEWBOX = [
  -MAP_PAD.x,
  -MAP_PAD.top,
  US_MAP_VIEWBOX.width + MAP_PAD.x * 2,
  US_MAP_VIEWBOX.height + MAP_PAD.top + MAP_PAD.bottom,
].join(" ");

function isTiny(state: UsState): boolean {
  const [x0, y0, x1, y1] = state.bbox;
  return x1 - x0 < TINY_THRESHOLD && y1 - y0 < TINY_THRESHOLD;
}

export function UsStatesMap({
  className,
  selectedCode,
  disabledCodes,
  highlightedCodes,
  onSelect,
}: UsStatesMapProps) {
  const [activeCode, setActiveCode] = useState<string | null>(null);
  // States whose flag asset is not there (yet). Remembered so a missing file is requested once per
  // session rather than on every hover.
  const [flagFailed, setFlagFailed] = useState<ReadonlySet<string>>(new Set());
  const disabled = new Set(disabledCodes ?? []);
  const highlighted = new Set(highlightedCodes ?? []);

  // The pin follows the pointer when there is one, and otherwise the externally highlighted state
  // — but only when exactly one is highlighted. A letter covering eight states has no single place
  // to put a pin, and eight pins would be noise.
  const pinnedCode =
    activeCode ?? (highlightedCodes?.length === 1 ? highlightedCodes[0] : null) ?? null;
  const active = US_STATES.find((s) => s.code === pinnedCode) ?? null;

  const activate = (state: UsState) => {
    if (disabled.has(state.code)) return;
    onSelect?.(state);
  };

  return (
    <svg
      viewBox={VIEWBOX}
      role="group"
      aria-label="Map of the United States — choose a state"
      className={cn("h-auto w-full", className)}
    >
      {/**
       * The base map. It fades back as a whole while a state is raised, so the raised one reads as
       * being ABOVE the country rather than merely recoloured within it. Dimming the layer — rather
       * than each of the fifty-one shapes — is what keeps the borders between them from flickering
       * as the pointer crosses, and it costs one composited opacity instead of 51 fill transitions.
       */}
      <g
        className="transition-opacity duration-200"
        style={{ opacity: active ? BASE_DIM_OPACITY : 1 }}
      >
        {US_STATES.map((state) => {
          const isDisabled = disabled.has(state.code);
          const isSelected = state.code === selectedCode;
          const isHighlighted = highlighted.has(state.code);
          const tiny = isTiny(state);

          const interaction = {
            role: "button" as const,
            "aria-label": state.name,
            "aria-disabled": isDisabled || undefined,
            "aria-pressed": isSelected || undefined,
            tabIndex: isDisabled ? -1 : 0,
            onMouseEnter: () => setActiveCode(state.code),
            onMouseLeave: () => setActiveCode((c) => (c === state.code ? null : c)),
            onFocus: () => setActiveCode(state.code),
            onBlur: () => setActiveCode((c) => (c === state.code ? null : c)),
            onClick: () => activate(state),
            // Neither a <path> nor a <circle> is a native button, so Enter/Space have to be wired up
            // by hand for the role to be honest.
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate(state);
              }
            },
          };

          /**
           * The state under the pointer is drawn in the card's own colour — invisible. It is not
           * "highlighted in place"; it is LIFTED OUT of the country, and the raised copy above is
           * now the state.
           *
           * This is the only way the raised copy can be said to cover its own footprint. Enlarging
           * a shape about a single point cannot cover the original unless the shape is convex, and
           * several are emphatically not: Florida's bbox centre falls in the Gulf between the
           * panhandle and the peninsula, and Hawaii is eight separate islands that a scale simply
           * pushes apart. Any fill left underneath — tint, border grey, anything — surfaces as a
           * ghost beside the state, which reads as the map having jumped. Nothing underneath,
           * nothing to be offset from.
           *
           * The stroke is already the card colour, so the shape vanishes completely; the states
           * around it draw their own edges, so the country keeps its borders.
           */
          const raised = state.code === pinnedCode;

          // One fill class, chosen here rather than layered — Tailwind resolves competing utilities
          // by stylesheet order, not by their order in the class list, so two would be a coin toss.
          const fillClass = isDisabled
            ? "fill-border/40"
            : raised
              ? "fill-card"
              : isSelected
                ? "fill-primary"
                : isHighlighted
                  ? "fill-sage"
                  : "fill-border";

          const shapeClass = cn(
            "outline-none transition-[fill,stroke] duration-150 [vector-effect:non-scaling-stroke]",
            "stroke-[1.5] stroke-card",
            fillClass,
            isDisabled && "opacity-55",
            isSelected && !isDisabled && !raised && "stroke-white",
            !isDisabled && !tiny && "cursor-pointer focus-visible:stroke-primary",
          );

          return (
            <path
              key={state.code}
              id={`state-${state.code}`}
              data-state-code={state.code}
              data-state-name={state.name}
              d={state.d}
              className={shapeClass}
              // For a tiny state the ring below is the control, so the shape must not also be one —
              // otherwise the same place would answer to two buttons.
              {...(tiny ? { pointerEvents: "none" as const, "aria-hidden": true } : interaction)}
            >
              {!tiny ? <title>{state.name}</title> : null}
            </path>
          );
        })}

        {/**
         * Hit discs for the shapes too small to point at, drawn AFTER every state.
         *
         * They paint NOTHING. The District of Columbia is drawn above with its real Census
         * boundary, exactly like the other fifty, and gets its fill, its selection colour and its
         * lift from that shape; this only widens the area where the pointer finds it, from 4×5
         * units to a disc of radius `TINY_HIT_RADIUS`. Substituting a dot for the outline would
         * mean the one place on the map where the border shown is not the real border.
         *
         * It has to be an invisible FILL rather than no fill: `fill: none` is not hit-tested at
         * all, so the disc would catch nothing.
         *
         * SVG has no z-index — later elements paint over earlier ones — and the data is ordered by
         * USPS code, which puts DC eighth, before the Maryland and Virginia that surround it. Drawn
         * inline with the others its disc was buried by both and DC could not be hovered at all.
         * The second pass is what puts it on top.
         */}
        {US_STATES.filter(isTiny).map((state) => {
          const isDisabled = disabled.has(state.code);
          const isSelected = state.code === selectedCode;

          return (
            <circle
              key={`ring-${state.code}`}
              data-state-code={state.code}
              cx={state.cx}
              cy={state.cy}
              r={TINY_HIT_RADIUS}
              role="button"
              aria-label={state.name}
              aria-disabled={isDisabled || undefined}
              aria-pressed={isSelected || undefined}
              tabIndex={isDisabled ? -1 : 0}
              onMouseEnter={() => setActiveCode(state.code)}
              onMouseLeave={() => setActiveCode((c) => (c === state.code ? null : c))}
              onFocus={() => setActiveCode(state.code)}
              onBlur={() => setActiveCode((c) => (c === state.code ? null : c))}
              onClick={() => activate(state)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate(state);
                }
              }}
              className={cn(
                // Invisible, always: `fill-transparent` is a hit target, not a mark. The one
                // exception is keyboard focus, which otherwise lands on nothing a sighted keyboard
                // user can locate — the lift alone is 4×5 units away from the ring.
                "fill-transparent outline-none [vector-effect:non-scaling-stroke]",
                isDisabled
                  ? "pointer-events-none"
                  : "cursor-pointer focus-visible:stroke-primary focus-visible:stroke-[1.5]",
              )}
            >
              <title>{state.name}</title>
            </circle>
          );
        })}
      </g>

      {/**
       * The hovered state, lifted. A COPY of the same path is drawn on top, scaled about its own
       * centroid and filled with the state's flag clipped to its outline — the silhouette becomes
       * the frame. Drawn last so it floats over its neighbours, and `pointer-events-none` so it
       * cannot steal the hover that summoned it: the original path underneath keeps that, which is
       * what stops the lift from flickering as the pointer crosses onto the raised copy.
       *
       * The flag is only ever fetched for the state under the pointer, so this costs one image per
       * hover rather than fifty on load.
       */}
      {active ? (
        <g aria-hidden pointerEvents="none">
          <defs>
            <clipPath id={`clip-${active.code}`}>
              <path d={active.d} />
            </clipPath>
          </defs>

          {/**
           * ONE group carries both the placement and the entry animation, and both are the same
           * `scale` about the same origin — so the keyframe's end state IS the resting state and
           * there is nothing to snap back to. (Two groups, or a keyframe ending anywhere other than
           * the resting transform, is what produced the earlier two-stage stutter.)
           *
           * `transform-box: fill-box` + `origin-center` means "grow about your own middle" in the
           * shape's own terms, with no coordinates in the transform at all. Nothing translates, so
           * the raised copy lands exactly on the state it came from — the frame is padded instead
           * (see MAP_PAD) so even Alaska has room to grow in place.
           */}
          <g
            // The key restarts the animation when the pointer moves to a different state — without
            // it React reuses the element and the second state simply appears.
            key={active.code}
            className="state-lift [transform-box:fill-box] origin-center animate-[state-lift_260ms_cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `scale(${liftScale(active)})` }}
          >
            {/* Opaque WHITE backing — the ground the flag sits on, and the only thing behind it.
                Without a ground the dimmed country shows through, because the base layer sits
                directly underneath. It has to be white rather than a palette fill because the flag
                PNGs carry an alpha channel: Ohio's is a swallowtail burgee, so a large part of its
                bounding box is transparent and whatever is underneath IS the state's colour there.
                A tinted ground made Ohio read as a green state. */}
            <path
              d={active.d}
              className="fill-white stroke-white stroke-[2] drop-shadow-lg [vector-effect:non-scaling-stroke]"
            />

            {flagFailed.has(active.code) ? (
              /* Only when the flag genuinely fails to load: a plain tint, so the state still
                   reads as raised rather than as a white hole in the map. */
              <path d={active.d} className="fill-sage" />
            ) : (
              /**
               * The flag, clipped to the state. Sized to the state's bounding box and stretched to
               * cover it, so no state shows bare canvas inside its own outline.
               *
               * `onError` is what lets the set arrive one state at a time: a state with no flag yet
               * silently falls back to the tint above, with no manifest to maintain and no code
               * change when the next file lands.
               */
              <image
                href={stateFlagUrl(active.name)}
                x={active.bbox[0]}
                y={active.bbox[1]}
                width={active.bbox[2] - active.bbox[0]}
                height={active.bbox[3] - active.bbox[1]}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#clip-${active.code})`}
                onError={() => setFlagFailed((failed) => new Set(failed).add(active.code))}
              />
            )}

            {/* Redrawn on top of the flag so the outline stays crisp against it. */}
            <path
              d={active.d}
              className="fill-none stroke-white stroke-[1.5] [vector-effect:non-scaling-stroke]"
            />
          </g>
        </g>
      ) : null}
    </svg>
  );
}
