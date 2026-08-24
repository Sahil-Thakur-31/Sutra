"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddHabitForm } from "@/components/habits/AddHabitForm";
import { HabitList } from "@/components/habits/HabitList";
import type { HabitDTO } from "@/lib/types";

export default function HabitsPage() {
  const { profile, household, loading } = useHousehold();
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/habits`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setHabits(data.habits ?? []);
          setHabitsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household) return;
    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "habit-added"; habit: HabitDTO }
        | { type: "habit-updated"; habit: HabitDTO }
        | { type: "habit-removed"; habitId: string }
        | { type: string };

      if (data.type === "habit-added") {
        const habit = (data as { habit: HabitDTO }).habit;
        setHabits((prev) => (prev.some((h) => h.id === habit.id) ? prev : [habit, ...prev]));
      } else if (data.type === "habit-updated") {
        const habit = (data as { habit: HabitDTO }).habit;
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      } else if (data.type === "habit-removed") {
        const habitId = (data as { habitId: string }).habitId;
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
      }
    };
    return () => source.close();
  }, [household]);

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Habits"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddHabitForm household={household} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">Family habits</h3>
              <span className="text-xs text-fg-subtle">{habits.length} tracked</span>
            </div>

            <HabitList householdId={household.id} habits={habits} loading={habitsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
