"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Checkbox } from "@/components/ui/Checkbox";
import { TrashIcon, BellIcon, RepeatIcon, SpinnerIcon } from "@/components/ui/icons";
import { reminderKindMeta, reminderRecurrenceLabel } from "@/lib/reminderMeta";
import type { ReminderDTO } from "@/lib/types";

interface ReminderListProps {
  householdId: string;
  reminders: ReminderDTO[];
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
  return { text: `In ${diffDays}d`, overdue: false };
}

export function ReminderList({ householdId, reminders, loading, emptyMessage }: ReminderListProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function dismiss(reminder: ReminderDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      if (!res.ok) toast.error("Couldn't update that reminder.");
    } catch {
      toast.error("Couldn't update that reminder.");
    }
  }

  async function removeReminder(reminder: ReminderDTO) {
    const displayText = reminder.translations?.[profile?.preferredLanguage ?? "en"] ?? reminder.title;
    const ok = await confirm({ title: `Delete "${displayText}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deleting.start(reminder.id);
    try {
      const res = await fetch(`/api/households/${householdId}/reminders/${reminder.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that reminder.");
    } catch {
      toast.error("Couldn't remove that reminder.");
    } finally {
      deleting.stop(reminder.id);
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

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <BellIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">{emptyMessage ?? "No reminders yet — add the first one."}</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {reminders.map((reminder) => {
          const displayText = reminder.translations?.[myLang] ?? reminder.title;
          const due = dueLabel(reminder.dueDate);
          const checked = reminder.status === "done";
          const kindMeta = reminderKindMeta(reminder.kind);

          return (
            <motion.li
              key={reminder.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-start gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
            >
              <div className="pt-0.5">
                <Checkbox checked={checked} onChange={() => !checked && dismiss(reminder)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${checked ? "text-fg-subtle line-through" : "text-fg"}`}>{displayText}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ color: `var(--color-${kindMeta.colorVar})`, backgroundColor: `var(--color-${kindMeta.colorVar}-soft)` }}
                  >
                    {kindMeta.label}
                  </span>
                  {reminder.recurrence !== "once" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-fg-subtle">
                      <RepeatIcon className="size-2.5" />
                      {reminderRecurrenceLabel(reminder.recurrence)}
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
              </div>
              <button
                onClick={() => removeReminder(reminder)}
                disabled={deleting.has(reminder.id)}
                aria-label="Remove reminder"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(reminder.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
