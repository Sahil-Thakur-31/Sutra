"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, ChecklistIcon, SpinnerIcon } from "@/components/ui/icons";
import { mealTypeLabel, dayLabel } from "@/lib/mealMeta";
import { weekDays } from "./WeekNav";
import type { MealDTO } from "@/lib/types";

export function MealPlanList({
  householdId,
  weekStartValue,
  meals,
  loading,
}: {
  householdId: string;
  weekStartValue: number;
  meals: MealDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function removeMeal(meal: MealDTO) {
    const displayText = meal.translations?.[profile?.preferredLanguage ?? "en"] ?? meal.description;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(meal.id);
    try {
      const res = await fetch(`/api/households/${householdId}/meals/${meal.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that meal.");
    } catch {
      toast.error("Couldn't remove that meal.");
    } finally {
      deleting.stop(meal.id);
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

  const myLang = profile?.preferredLanguage ?? "en";
  const days = weekDays(weekStartValue);

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ChecklistIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">No meals planned this week yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const dayMeals = meals.filter((m) => m.date === day);
        return (
          <div key={day} className="rounded-2xl border border-border bg-bg-elevated px-4 py-3">
            <p className="text-sm font-semibold text-fg">{dayLabel(day)}</p>
            {dayMeals.length === 0 ? (
              <p className="mt-1 text-xs text-fg-subtle">Nothing planned yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {dayMeals.map((meal) => {
                    const displayText = meal.translations?.[myLang] ?? meal.description;
                    return (
                      <motion.li
                        key={meal.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        className="flex items-center gap-2.5 rounded-xl bg-bg px-3 py-2"
                      >
                        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                          {mealTypeLabel(meal.mealType)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-fg">{displayText}</p>
                          {meal.assignedToName && <p className="truncate text-xs text-fg-subtle">by {meal.assignedToName}</p>}
                        </div>
                        <button
                          onClick={() => removeMeal(meal)}
                          disabled={deleting.has(meal.id)}
                          aria-label="Remove meal"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                        >
                          {deleting.has(meal.id) ? (
                            <SpinnerIcon className="size-3.5 animate-spin" />
                          ) : (
                            <TrashIcon className="size-3.5" />
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
