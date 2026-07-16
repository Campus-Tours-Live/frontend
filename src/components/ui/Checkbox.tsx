"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Checkbox — a selectable option (checked / unchecked / indeterminate). Controlled: pass `checked` +
 * `onChange`. An accessible name is required and enforced at compile time — pass exactly one of
 * `label` (rendered beside the box), `aria-label`, or `aria-labelledby` (id of an external label).
 * `className` styles the wrapping <label>; remaining props (`name`, `value`, `id`, …) flow to the input.
 *
 *   <Checkbox label="Email me updates" checked={on} onChange={(e) => setOn(e.target.checked)} />
 *   <Checkbox label="Select all" indeterminate={some} checked={all} onChange={toggleAll} />
 */
type CheckboxBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "aria-label" | "aria-labelledby"
> & {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Visually shows a dash and marks the input `indeterminate` (announced as "mixed"). */
  indeterminate?: boolean;
};

type CheckboxLabelProps = CheckboxBaseProps & {
  label: ReactNode;
  "aria-label"?: never;
  "aria-labelledby"?: never;
};
type CheckboxAriaLabelProps = CheckboxBaseProps & {
  "aria-label": string;
  label?: never;
  "aria-labelledby"?: never;
};
type CheckboxLabelledByProps = CheckboxBaseProps & {
  "aria-labelledby": string;
  label?: never;
  "aria-label"?: never;
};

export type CheckboxProps = CheckboxLabelProps | CheckboxAriaLabelProps | CheckboxLabelledByProps;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
  const {
    label,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    indeterminate = false,
    checked = false,
    disabled = false,
    className,
    onChange,
    ...inputRest
  } = props as CheckboxBaseProps & {
    label?: ReactNode;
    "aria-label"?: string;
    "aria-labelledby"?: string;
  };

  // Merge the forwarded ref with an internal one so we can set the `indeterminate` DOM property
  // (it has no HTML attribute).
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const filled = checked || indeterminate;
  const boxTone = disabled
    ? filled
      ? "border-border bg-border text-white"
      : "border-border bg-canvas"
    : filled
      ? "border-primary bg-primary text-white"
      : "border-border bg-white";

  return (
    <label
      className={cn(
        "control-label",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <input
        ref={setRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="peer sr-only"
        {...inputRest}
      />
      <span aria-hidden className={cn("control-box rounded-[5px]", boxTone)}>
        {indeterminate ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
            <path d="M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
            <path
              d="M3.5 8.5l3 3 6-6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label ? <span className="leading-[18px]">{label}</span> : null}
    </label>
  );
});
