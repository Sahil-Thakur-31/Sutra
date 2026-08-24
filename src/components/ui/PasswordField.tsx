"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { FieldWrapper, fieldClasses, borderClasses } from "./TextField";
import { EyeIcon, EyeOffIcon } from "./icons";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <FieldWrapper label={label} error={error}>
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            className={`${fieldClasses} ${borderClasses(!!error)} w-full pr-10 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
          >
            {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </FieldWrapper>
    );
  }
);
PasswordField.displayName = "PasswordField";
