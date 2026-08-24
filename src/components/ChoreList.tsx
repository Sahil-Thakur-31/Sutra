"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Checkbox } from "@/components/ui/Checkbox";
import { Avatar } from "@/components/ui/Avatar";
import { TrashIcon, ChecklistIcon, RepeatIcon, SpinnerIcon } from "@/components/ui/icons";
import { recurrenceLabel } from "@/lib/choreMeta";
import type { ChoreDTO } from "@/lib/types";

interface ChoreListProps {
  householdId: string;
  chores: ChoreDTO[];
  loading: boolean;
  emptyMessage?: string;
}

function dueLabel(dueDate: number): { text: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, overdue: true };
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${diffDays}d`, overdue: false };
}

export function ChoreList({ householdId, chores, loading, emptyMessage }: ChoreListProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function markDone(chore: ChoreDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/chores/${chore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      if (!res.ok) toast.error("Couldn't update that chore.");
    } catch {
      toast.error("Couldn't update that chore.");
    }
  }

  async function removeChore(chore: ChoreDTO) {
    const displayText = chore.translations?.[profile?.preferredLanguage ?? "en"] ?? chore.title;
    const ok = await confirm({ title: `Delete "${displayText}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deleting.start(chore.id);
    try {
      const res = await fetch(`/api/households/${householdId}/chores/${chore.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that chore.");
    } catch {
      toast.error("Couldn't remove that chore.");
    } finally {
      deleting.stop(chore.id);
    }
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

  if (chores.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ChecklistIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">{emptyMessage ?? "No chores yet — add the first one."}</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {chores.map((chore) => {
          const displayText = chore.translations?.[myLang] ?? chore.title;
          const due = dueLabel(chore.dueDate);
          const checked = chore.status === "done";

          return (
            <motion.li
              key={chore.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-start gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
            >
              <div className="pt-0.5">
                <Checkbox checked={checked} onChange={() => !checked && markDone(chore)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${checked ? "text-fg-subtle line-through" : "text-fg"}`}>{displayText}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {chore.recurrence !== "once" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cat-blue-soft px-2 py-0.5 text-[11px] font-medium text-cat-blue">
                      <RepeatIcon className="size-2.5" />
                      {recurrenceLabel(chore.recurrence)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      due.overdue ? "bg-danger-soft text-danger" : "bg-bg text-fg-subtle"
                    }`}
                  >
                    {due.text}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Avatar name={chore.assigneeName ?? "Anyone"} className="size-4 text-[9px]" />
                  <span className="truncate text-xs text-fg-subtle">{chore.assigneeName ?? "Anyone"}</span>
                </div>
              </div>
              <button
                onClick={() => removeChore(chore)}
                disabled={deleting.has(chore.id)}
                aria-label="Remove chore"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(chore.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
