# CampusToursLive — Design Tokens

Tokens derived from `CampusToursLive-design.html` + `CampusToursLive-design_new.html`.
Values live as HSL CSS variables in `src/app/globals.css`; Tailwind mappings in
`tailwind.config.ts`. Brand fonts (Quicksand display / Nunito text) are loaded via
`next/font` in `src/app/layout.tsx`. **Light theme only** — the `.dark` block in
`globals.css` keeps neutral fallbacks so `class="dark"` never produces broken colors,
but no dark theme is defined.

## Colors

| Utility                                                      | Hex                               | Use                                   |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------- |
| `bg-background`                                              | `#FFFDF9`                         | Page surface (ivory-50)               |
| `bg-ivory`                                                   | `#FAF7F0`                         | Warm ivory blocks                     |
| `bg-canvas`                                                  | `#F1ECE2`                         | Image placeholders / muted fills      |
| `text-ink` / `text-foreground`                               | `#2F3437`                         | Primary text                          |
| `text-ink-soft`                                              | `#697076`                         | Secondary / metadata text             |
| `bg-card`                                                    | `#FFFFFF`                         | Card surface                          |
| `border-border`                                              | `#E6E0D6`                         | Default border (beige-200)            |
| `bg-primary` `text-primary`                                  | `#4F6F8F`                         | Primary brand (blue-500)              |
| `bg-primary-dark`                                            | `#415E79`                         | Primary hover (blue-600)              |
| `bg-primary-soft`                                            | `#E5ECF2`                         | Subtle tint / hovers / badges         |
| `bg-secondary`                                               | `#A8BFA3`                         | Sage-400                              |
| `bg-sage-deep`                                               | `#8FA88A`                         | Sage-500 (trust dots)                 |
| `bg-sage-soft` `text-sage-foreground`                        | `#EAF0E7` / `#5A7253`             | Sage badge                            |
| `bg-coral`                                                   | `#E9AFA3`                         | Accent coral                          |
| `bg-coral-soft` `text-coral-foreground`                      | `#F8E9E5` / `#A85A4D`             | Coral badge                           |
| `bg-purple`                                                  | `#8A78C8`                         | Guardian accent (purple)              |
| `bg-purple-soft` `text-purple-foreground`                    | `#EFEBFB` / `#5F4BA0`             | Guardian badge                        |
| `bg-success(-soft)` `text-success-foreground`                | `#7FA98A` / `#E6F0E8` / `#4D7A5A` | Success                               |
| `bg-warning(-soft)` `text-warning-foreground`                | `#E0B06A` / `#F8EEDD` / `#9A6F2E` | Warning                               |
| `bg-error(-soft)` `text-error-foreground` / `bg-destructive` | `#D98A82` / `#F8E4E1` / `#A85A4D` | Error / destructive                   |
| `text-amber`                                                 | `#E0B06A`                         | Star ratings                          |
| `text-teal`                                                  | `#3E6E6A`                         | Campus name on a tour card            |
| `bg-scrim`                                                   | `#2F3437`                         | Modal / drawer overlay (with opacity) |

All support opacity, e.g. `bg-primary/10`, `border-border/70`.

## Tour-topic colours

A **categorical** scale, separate from everything above. Its only job is that no two topics look
alike; it is deliberately decoupled from the semantic tokens, which were each chosen for a different
job (a brand action, a positive status, a caution) and were never designed to be told apart from one
another. Each family has a base, a `-soft` tint, and a `-foreground`.

| Family   | Base      | `-foreground` | Topic                 |
| -------- | --------- | ------------- | --------------------- |
| `blush`  | `#DA8B90` | `#9A4E55`     | Campus life           |
| `azure`  | `#5291C4` | `#055587`     | Dorms & housing       |
| `rust`   | `#B37044` | `#70390F`     | Dining & student life |
| `olive`  | `#C0AE5E` | `#82700D`     | International         |
| `iris`   | `#B1BBE2` | `#666F95`     | Academics & majors    |
| `mauve`  | `#A36A9C` | `#672F61`     | For parents           |
| `moss`   | `#618E57` | `#27541C`     | First-year            |
| `lagoon` | `#4BB7A5` | `#027869`     | Transfer              |

`-foreground` doubles as the fill for the topic chip (`Tag variant="inverse"` puts ivory text on
it), so every one of them clears 4.5:1 against ivory.

> Do not hand-pick a colour for a ninth topic. The separation guarantee is a property of the **set**,
> and `tests/unit/components/tours/topic-colour-distance.test.ts` measures it against these tokens.

## Glass

`.glass` plus one tone class — a material, not a tint: blur, backdrop saturation, a lit top edge and
a contact shadow. Tones are **not** interchangeable, because a tone is a claim about the background:

| Class          | For                                                     |
| -------------- | ------------------------------------------------------- |
| `.glass-light` | dark / photo grounds only (ivory material, ivory glyph) |
| `.glass-dark`  | light grounds only (translucent card, ink glyph)        |
| `.glass-smoke` | **arbitrary imagery** — the only tone legible on both   |

Honours `prefers-reduced-transparency` by going opaque, and thickens the tint where
`backdrop-filter` is unsupported.

## Role accent tokens

Semantic aliases so any role-coloured surface reuses one source — change the
underlying brand token and every role surface re-themes. Each has `DEFAULT`, `-soft`,
and `-foreground` (e.g. `bg-role-guide`, `bg-role-guide-soft`, `text-role-guide-foreground`).

| Utility            | Aliases             | Member role       |
| ------------------ | ------------------- | ----------------- |
| `role-participant` | → `primary` (blue)  | Participant       |
| `role-guide`       | → `warning` (amber) | Guide             |
| `role-guardian`    | → `purple`          | Guardian / parent |

## Typography

Families: `font-sans` (Nunito, default) · `font-display` (Quicksand).

| Utility        | Size                          |
| -------------- | ----------------------------- |
| `text-display` | clamp(42–76px), 700           |
| `text-h1`      | clamp(28–44px), 700           |
| `text-h2`      | clamp(24–36px), 700           |
| `text-h3`      | 19px, 700                     |
| `text-h4`      | 16px, 700                     |
| `text-lead`    | clamp(16–18px), 500           |
| `text-body`    | 15.5px                        |
| `text-caption` | 13px                          |
| `text-eyebrow` | 13px, 700, uppercase tracking |

`display` and `h1` are **not** the same size — `display` is the hero, `h1` sits below it so content
pages don't shout on desktop.

**Interface text** — a separate scale from the prose sizes above, carrying size only (no
line-height), so it drops into a component without shifting vertical rhythm:

| Utility      | Size | Used for                                            |
| ------------ | ---- | --------------------------------------------------- |
| `text-ui-lg` | 15px | Body `large`, Heading `small`, buttons, picker rows |
| `text-ui`    | 14px | Body `medium`, labels, menus, nav                   |
| `text-ui-sm` | 13px | Body `small`, field help/error, chips, badges       |

## Radius / elevation / width

`rounded-field` 10 · `rounded-card` 16 · `rounded-panel` 24 · `rounded-hero` 32 · `rounded-pill` 999.
`shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-card`.
`max-w-content` = 1180px (page container width).

## Semantic component classes

Defined in `globals.css` (`@layer components`) — write **one class** instead of a
long utility string. Built on the tokens above, so changing a token re-themes
every class.

| Class                                                           | What                                      |
| --------------------------------------------------------------- | ----------------------------------------- |
| `h1` `h2` `h3` `h4` `lead` `body` `caption` `muted` `eyebrow`   | Text styles                               |
| `btn` + `btn-primary\|secondary\|accent\|ghost`                 | Buttons (+ `btn-sm` `btn-lg` `btn-block`) |
| `card` `card-pad`                                               | Card surface / padding                    |
| `field` `input` `search` (+ `field-error` `field-hint`)         | Form controls                             |
| `badge` + `badge-primary\|sage\|coral\|success\|warn\|verified` | Status badges                             |
| `status` + `status-info\|warning\|success\|error`               | Status pills (leading dot)                |
| `alert` + `alert-info\|warning\|success\|error`                 | Block messages / banners                  |
| `chip` `chip.active` `chip-sm`                                  | Filter chips                              |
| `divider`                                                       | Hairline rule                             |

```tsx
<button className="btn btn-primary">Explore live tours</button>
<button className="btn btn-secondary">Become a guide</button>

<article className="card card-pad">
  <span className="status status-success">Verified guide</span>
  <h4 className="h4">Campus life and hidden study spots</h4>
  <span className="text-ink-soft">North Coast University · Maya Chen · 60 min</span>
</article>
```

> `btn-secondary` follows design_new (white surface, blue outline). Use `btn-primary`
> for the filled blue CTA.
