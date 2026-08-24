"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: ReactNode;
}

// The error bubble is absolutely positioned so it floats over whatever comes
// next in the form instead of pushing it down -- validation must not shift
// layout as the user types.
export function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  return (
    <div className="relative flex flex-col gap-1.5 text-sm">
      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-fg/80">{label}</span>
        {children}
      </label>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-10 mt-1 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-accent-fg shadow-[0_4px_12px_-2px_rgb(var(--shadow-color)/0.35)]"
          >
            <span className="absolute -top-1 left-4 size-2 rotate-45 bg-danger" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const fieldClasses =
  "rounded-xl border bg-bg px-3.5 py-2.5 text-fg outline-none transition-shadow placeholder:text-fg-subtle focus:ring-4";

export function borderClasses(hasError?: boolean) {
  return hasError ? "border-danger focus:border-danger focus:ring-danger-soft" : "border-border focus:border-accent/60 focus:ring-accent-soft";
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <FieldWrapper label={label} error={error}>
      <input ref={ref} className={`${fieldClasses} ${borderClasses(!!error)} ${className}`} {...props} />
    </FieldWrapper>
  )
);
TextField.displayName = "TextField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, className = "", children, ...props }, ref) => (
    <FieldWrapper label={label} error={error}>
      <select ref={ref} className={`${fieldClasses} ${borderClasses(!!error)} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
);
SelectField.displayName = "SelectField";
