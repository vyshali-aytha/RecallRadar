import type { ReactNode } from "react";
import { FormLabel } from "@/components/ui/primitives";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, required = false, hint, error, children }: FormFieldProps) {
  return (
    <div>
      <FormLabel htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-amber-ink">*</span>}
      </FormLabel>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-700" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
