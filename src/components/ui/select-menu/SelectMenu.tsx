"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "../icon/Icon";
import { FormHelperText } from "../form/FormHelperText";
import { Popover } from "../popover/Popover";

export interface SelectMenuOption {
  value: string;
  label: string;
}

export interface SelectMenuProps {
  /** Accessible label (required). */
  label: ReactNode;
  /** Selected option value; `""` means nothing chosen yet. */
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  /** Trigger text when nothing is selected and the menu is closed. */
  placeholder?: string;
  disabled?: boolean;
  /** Error text under the control; overrides `helperText` and flags the field invalid. */
  error?: ReactNode;
  helperText?: ReactNode;
  /** Placeholder for the input while the menu is open (type to filter). */
  searchPlaceholder?: string;
  id?: string;
  /** Fired when the control gains focus (e.g. to clear a "required" error). */
  onFocus?: () => void;
  className?: string;
}

/**
 * SelectMenu — a single-choice picker whose control is one editable combobox input (the trigger and
 * the filter are the same box, like the university search), backed by a branded {@link Popover} +
 * `role="listbox"` dropdown instead of the OS-native, un-styleable `<select>` menu. Use for
 * controlled vocabularies (e.g. the onboarding major / degree pickers). Closed, the input shows the
 * chosen label; focus it to type-to-filter. Keyboard: ↓ opens / moves, ↑ moves, Enter chooses, Esc
 * closes.
 */
export function SelectMenu({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  error,
  helperText,
  searchPlaceholder = "Search…",
  id,
  onFocus,
  className,
}: SelectMenuProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const labelId = `${autoId}-label`;
  const listboxId = `${autoId}-listbox`;
  const helperId = `${autoId}-helper`;
  const helperContent = error ?? helperText;

  // Callback-ref into state (not useRef.current) so the Popover anchor is reactive and we never read
  // a ref during render.
  const [anchorEl, setAnchorEl] = useState<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState<number>();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const cancelScheduledClose = () => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenu = () => {
    // A previous focus change may still have its delayed blur close pending. Reopening must cancel
    // it, otherwise that stale timer can close the newly opened menu before an option is clicked.
    cancelScheduledClose();
    if (disabled || open) return;
    setWidth(anchorEl?.offsetWidth);
    setActive(0);
    setOpen(true);
  };
  const close = () => {
    cancelScheduledClose();
    setOpen(false);
    setQuery("");
  };
  const choose = (v: string) => {
    cancelScheduledClose();
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  useEffect(
    () => () => {
      cancelScheduledClose();
    },
    [],
  );

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openMenu();
      else setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Shares `.form-label` with Field-based labels (University etc.) so every form label matches.
          No htmlFor: the input is named via aria-labelledby, and clicking the label must NOT focus
          the input (which would open the dropdown). */}
      <label id={labelId} className={cn("form-label", disabled && "text-ink-soft")}>
        {label}
      </label>

      <div className="relative">
        <input
          ref={setAnchorEl}
          id={inputId}
          role="combobox"
          aria-labelledby={labelId}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={helperContent ? helperId : undefined}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "input cursor-pointer pr-10",
            error && "border-error",
            disabled && "cursor-not-allowed opacity-60",
          )}
          placeholder={open ? searchPlaceholder : placeholder}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            if (!open) openMenu();
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => {
            openMenu();
            onFocus?.();
          }}
          onClick={openMenu}
          onKeyDown={onKey}
          // Delay so an option's click lands before the menu closes on blur.
          onBlur={() => {
            cancelScheduledClose();
            closeTimer.current = setTimeout(close, 150);
          }}
        />
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

      <Popover open={open} anchorEl={anchorEl} onClose={close} align="start" role="presentation">
        <div
          className="overflow-hidden rounded-card border border-border bg-card shadow-card"
          style={{ width }}
        >
          <ul id={listboxId} role="listbox" className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-ui-sm text-ink-soft">No matches.</li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    tabIndex={-1}
                    // Keep focus on the input so its blur-close doesn't beat the click.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o.value)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center rounded-card px-3 py-2 text-left text-ui transition-colors",
                      i === active ? "bg-primary-soft text-ink" : "text-ink hover:bg-primary-soft",
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Popover>
    </div>
  );
}
