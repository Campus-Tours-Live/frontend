import { Children, type FieldsetHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Body } from "../typography/Body";
import { FormHelperText } from "./FormHelperText";

/**
 * FormGroup — groups related controls (checkboxes, radios, …) in a <fieldset> with a <legend> group
 * label and optional helper/error text. `error` overrides `helperText`. The legend labels the whole
 * group; each child keeps its own label.
 *
 *   <FormGroup label="Notify me about" helperText="Pick any">
 *     <Checkbox label="Bookings" … />
 *     <Checkbox label="Messages" … />
 *   </FormGroup>
 */
export interface FormGroupProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "children"
> {
  children: ReactNode;
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
}

export function FormGroup({
  children,
  className,
  error,
  helperText,
  label,
  ...rest
}: FormGroupProps) {
  const helper = error ?? helperText;

  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)} {...rest}>
      {label || helper ? (
        <legend className="mb-2 flex flex-col gap-1 p-0">
          {label ? (
            <Body as="span" size="medium" weight={600}>
              {label}
            </Body>
          ) : null}
          {helper ? <FormHelperText hasError={!!error}>{helper}</FormHelperText> : null}
        </legend>
      ) : null}

      <div className="flex flex-col gap-2">
        {Children.map(children, (child) => (
          <div>{child}</div>
        ))}
      </div>
    </fieldset>
  );
}
