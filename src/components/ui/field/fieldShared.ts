import { type ReactNode } from "react";

/** Control size. `large` (default) matches `.input`; `small` tightens padding + font. */
export type FieldSize = "small" | "large";

/** Size → extra classes layered over `.input`. `large` adds nothing (the `.input` default). */
export const SIZE_CLASS: Record<FieldSize, string | false> = {
  large: false,
  small: "px-3 py-2 text-[13px]",
};

/** Leading-icon overlay (shared by TextField + SelectField); the control reserves room with `pl-10`. */
export const LEADING_ICON_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft [&_svg]:h-[18px] [&_svg]:w-[18px]";

/** The Field-wrapper props every control wrapper (TextField / Textarea / SelectField) forwards. */
export type ControlExtras = {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  /** Class for the wrapping Field (the control itself uses `className`). */
  fieldClassName?: string;
};
