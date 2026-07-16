import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./Button";

/** Props for a wizard nav button — everything a Button takes except the locked `variant`/`size`. */
export type WizardFooterButtonProps = Omit<ButtonProps, "variant" | "size">;

/**
 * WizardFooter — the navigation footer for a multi-step flow: an optional content area (e.g. a
 * progress indicator) above a Previous / Continue button row. The two buttons' variant and size are
 * fixed (secondary / primary, md); everything else — label (`children`), `onClick`, `disabled`,
 * `type` — is set through `previousButtonProps` / `nextButtonProps`.
 *
 *   <WizardFooter
 *     previousButtonProps={{ onClick: back, disabled: isFirst }}
 *     nextButtonProps={{ children: isLast ? "Finish" : "Continue", onClick: next }}
 *   />
 */
export interface WizardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  nextButtonProps?: WizardFooterButtonProps;
  previousButtonProps?: WizardFooterButtonProps;
}

export function WizardFooter({
  children,
  className,
  nextButtonProps,
  previousButtonProps,
  ...rest
}: WizardFooterProps) {
  const { children: prevLabel = "Previous", ...prevRest } = previousButtonProps ?? {};
  const { children: nextLabel = "Continue", ...nextRest } = nextButtonProps ?? {};

  return (
    <div className={cn("flex flex-col gap-4", className)} {...rest}>
      {children ? <div>{children}</div> : null}

      <div className="flex items-center justify-between gap-3">
        <Button {...prevRest} variant="secondary" size="medium">
          {prevLabel}
        </Button>
        <Button {...nextRest} variant="primary" size="medium">
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
