"use client";

import { useMemo, useState } from "react";

/**
 * Live field validation: stays silent until the field has been blurred once,
 * then re-validates on every keystroke so the error clears the moment the
 * user fixes it -- without ever validating before their first interaction.
 */
export function useValidatedField(value: string, validate: (value: string) => string | undefined) {
  const [touched, setTouched] = useState(false);
  const error = useMemo(() => (touched ? validate(value) : undefined), [touched, value, validate]);

  return {
    error,
    onBlur: () => setTouched(true),
    markTouched: () => setTouched(true),
  };
}
