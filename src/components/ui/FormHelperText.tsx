import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption, type CaptionProps } from "./Caption";

/**
 * FormHelperText — the small helper / error line under a form control or {@link FormGroup} legend.
 * Muted by default; `hasError` switches it to the error colour and prepends an alert icon. Dims when
 * `disabled`. Built on {@link Caption}.
 */
export interface FormHelperTextProps extends Omit<CaptionProps, "color"> {
  disabled?: boolean;
  hasError?: boolean;
}

export function FormHelperText({
  children,
  className,
  disabled = false,
  hasError = false,
  ...rest
}: FormHelperTextProps) {
  return (
    <Caption
      color={hasError ? "error" : "muted"}
      className={cn("inline-flex items-center gap-1", disabled && "opacity-60", className)}
      {...rest}
    >
      {hasError ? <CircleAlert size={13} strokeWidth={2} className="shrink-0" aria-hidden /> : null}
      {children}
    </Caption>
  );
}
