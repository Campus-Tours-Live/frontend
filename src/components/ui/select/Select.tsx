import {
  forwardRef,
  useId,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Icon } from "../icon/Icon";
import { FormLabel } from "../form/FormLabel";
import { FormHelperText } from "../form/FormHelperText";

/** Control size. `large` (default) matches `.input`; `small` tightens padding + label. */
export type SelectSize = "large" | "small";

const SIZE_CLASS: Record<SelectSize, string | false> = {
  large: false,
  small: "px-3 py-2 text-[13px]",
};

/** Leading-icon overlay (mirrors TextField/SelectField); the select reserves room with `pl-10`. */
const LEADING_ICON_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft [&_svg]:h-[18px] [&_svg]:w-[18px]";

export interface SelectProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** The `<option>` elements. */
  children: ReactNode;
  /** @default false */
  disabled?: boolean;
  /** Error text under the control; overrides `helperText` and flags the field invalid. */
  error?: ReactNode;
  /** Helper text shown under the label. */
  helperText?: ReactNode;
  /** Id for the underlying `<select>` (auto-generated when omitted). */
  id?: string;
  /** Accessible label (required). */
  label: ReactNode;
  /** Decorative icon rendered inside the select's leading edge. */
  leadingIcon?: ReactNode;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  /** Extra props spread onto the `<select>` element. */
  selectProps?: ComponentPropsWithoutRef<"select">;
  /** @default "large" */
  size?: SelectSize;
  value?: string;
}

/**
 * Select — a single choice from a set of predefined `<option>`s (Living Design port). Renders a
 * {@link FormLabel} + native `<select>` + trailing caret, with an optional `leadingIcon` and
 * helper/error text via {@link FormHelperText} (`error` overrides `helperText`). Colour is inherited;
 * the native arrow is hidden (`appearance-none`) in favour of the themed caret.
 *
 * For a debounced, async, or multi-select control, use a combobox (e.g. UniversityMultiSelect) — a
 * native `<select>` can't do type-ahead or remote search.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    children,
    className,
    disabled = false,
    error,
    helperText,
    id,
    label,
    leadingIcon,
    onChange,
    selectProps,
    size = "large",
    value,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const helperId = useId();
  const helperContent = error ?? helperText;

  return (
    <div className={cn("w-full", className)} {...rest}>
      <FormLabel htmlFor={selectId} disabled={disabled} size={size} className="mb-1.5 block">
        {label}
      </FormLabel>

      <div className="relative">
        {leadingIcon ? (
          <span aria-hidden className={LEADING_ICON_CLASS}>
            {leadingIcon}
          </span>
        ) : null}

        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={helperContent ? helperId : undefined}
          {...selectProps}
          className={cn(
            "input cursor-pointer appearance-none pr-10",
            SIZE_CLASS[size],
            leadingIcon && "pl-10",
            error && "border-error",
            disabled && "cursor-not-allowed opacity-60",
            selectProps?.className,
          )}
        >
          {children}
        </select>

        <Icon
          name="chevronDown"
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>

      {helperContent ? (
        <FormHelperText id={helperId} hasError={!!error} disabled={disabled} className="mt-1">
          {helperContent}
        </FormHelperText>
      ) : null}
    </div>
  );
});
