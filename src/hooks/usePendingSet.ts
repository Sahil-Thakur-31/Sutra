"use client";

import { useCallback, useState } from "react";

/** Tracks which item ids currently have an in-flight action, so a button
 * for that specific row can disable itself and show a spinner without
 * blocking the rest of the list. */
export function usePendingSet() {
  const [pending, setPending] = useState<Set<string>>(new Set());

  const start = useCallback((id: string) => {
    setPending((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const stop = useCallback((id: string) => {
    setPending((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => pending.has(id), [pending]);

  return { start, stop, has };
}
