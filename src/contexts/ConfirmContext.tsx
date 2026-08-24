"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { WarningIcon } from "@/components/ui/icons";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). Defaults to true since this is mainly used for deletes. */
  danger?: boolean;
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ danger: true, ...options, resolve });
    });
  }, []);

  function settle(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle closes over `pending` intentionally, re-subscribing per pending change is the point
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
            onClick={() => settle(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-3xl border border-border bg-bg-elevated p-6 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_24px_48px_-16px_rgb(var(--shadow-color)/0.3)]"
            >
              <div className="flex items-start gap-3">
                {pending.danger && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                    <WarningIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-fg">{pending.title}</h2>
                  {pending.message && <p className="mt-1 text-sm text-fg-muted">{pending.message}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => settle(false)}>
                  {pending.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  type="button"
                  onClick={() => settle(true)}
                  className={pending.danger ? "!bg-danger hover:!bg-danger" : ""}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
