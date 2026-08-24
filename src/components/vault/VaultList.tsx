"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, EyeIcon, EyeOffIcon, LockIcon, SpinnerIcon } from "@/components/ui/icons";
import { vaultCategoryLabel, vaultCategoryColorVar } from "@/lib/vaultMeta";
import type { VaultEntryDTO } from "@/lib/types";

export function VaultList({
  householdId,
  entries,
  loading,
}: {
  householdId: string;
  entries: VaultEntryDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  async function removeEntry(entry: VaultEntryDTO) {
    const displayLabel = entry.translations?.[profile?.preferredLanguage ?? "en"] ?? entry.label;
    const ok = await confirm({ title: `Delete "${displayLabel}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deleting.start(entry.id);
    try {
      const res = await fetch(`/api/households/${householdId}/vault/${entry.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that entry.");
    } catch {
      toast.error("Couldn't remove that entry.");
    } finally {
      deleting.stop(entry.id);
    }
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <LockIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">Nothing saved yet — add your first entry.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const displayLabel = entry.translations?.[myLang] ?? entry.label;
          const colorVar = vaultCategoryColorVar(entry.category);
          const isHidden = entry.sensitive && !revealed.has(entry.id);

          return (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-fg">{displayLabel}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ color: `var(--color-${colorVar})`, backgroundColor: `var(--color-${colorVar}-soft)` }}
                  >
                    {vaultCategoryLabel(entry.category)}
                  </span>
                </div>
                <p className={`truncate text-sm ${isHidden ? "tracking-widest text-fg-subtle" : "text-fg-muted"}`}>
                  {isHidden ? "••••••••" : entry.value}
                </p>
              </div>
              {entry.sensitive && (
                <button
                  onClick={() => toggleReveal(entry.id)}
                  aria-label={isHidden ? "Reveal value" : "Hide value"}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  {isHidden ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
                </button>
              )}
              <button
                onClick={() => removeEntry(entry)}
                disabled={deleting.has(entry.id)}
                aria-label="Remove entry"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(entry.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
