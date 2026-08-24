"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { TrashIcon, FlameIcon, SpinnerIcon } from "@/components/ui/icons";
import { startOfDay } from "@/lib/recurrence";
import type { HabitDTO } from "@/lib/types";

const ONE_DAY = 24 * 60 * 60 * 1000;
const GRID_DAYS = 7;

export function HabitList({
  householdId,
  habits,
  loading,
}: {
  householdId: string;
  habits: HabitDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();
  // Computed once on mount via the lazy useState initializer (React's
  // sanctioned escape hatch for one-time impure reads) -- "today" doesn't
  // need to track a live clock for a grid that only shifts at midnight.
  const [today] = useState(() => startOfDay(Date.now()));
  const [days] = useState(() => Array.from({ length: GRID_DAYS }, (_, i) => today - (GRID_DAYS - 1 - i) * ONE_DAY));

  async function toggleToday(habit: HabitDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/habits/${habit.id}/checkin`, { method: "POST" });
      if (!res.ok) toast.error("Couldn't update that habit.");
    } catch {
      toast.error("Couldn't update that habit.");
    }
  }

  async function removeHabit(habit: HabitDTO) {
    const displayTitle = habit.translations?.[profile?.preferredLanguage ?? "en"] ?? habit.title;
    const ok = await confirm({ title: `Delete "${displayTitle}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deleting.start(habit.id);
    try {
      const res = await fetch(`/api/households/${householdId}/habits/${habit.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that habit.");
    } catch {
      toast.error("Couldn't remove that habit.");
    } finally {
      deleting.stop(habit.id);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <FlameIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">No habits yet — add one to start a streak.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {habits.map((habit) => {
          const displayTitle = habit.translations?.[myLang] ?? habit.title;
          const checkedToday = habit.recentCheckins.includes(today);
          const checkinSet = new Set(habit.recentCheckins);

          return (
            <motion.li
              key={habit.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
            >
              <Checkbox checked={checkedToday} onChange={() => toggleToday(habit)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-fg">{displayTitle}</p>
                  {habit.currentStreak > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-cat-amber-soft px-1.5 py-0.5 text-[11px] font-medium text-cat-amber">
                      <FlameIcon className="size-2.5" />
                      {habit.currentStreak}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar name={habit.ownerName} className="size-4 text-[9px]" />
                  <div className="flex gap-1">
                    {days.map((day) => (
                      <span
                        key={day}
                        className={`size-2.5 rounded-full ${checkinSet.has(day) ? "bg-sage" : "bg-border"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeHabit(habit)}
                disabled={deleting.has(habit.id)}
                aria-label="Remove habit"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(habit.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
