"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddMealForm } from "@/components/meals/AddMealForm";
import { MealPlanList } from "@/components/meals/MealPlanList";
import { WeekNav, weekStart, weekLabel } from "@/components/meals/WeekNav";
import type { MealDTO } from "@/lib/types";

export default function MealsPage() {
  const { profile, household, loading } = useHousehold();

  const [start, setStart] = useState(() => weekStart(new Date()));
  const [meals, setMeals] = useState<MealDTO[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    // Resets the loading skeleton on every week change, not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMealsLoading(true);
    fetch(`/api/households/${household.id}/meals?week=${start}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setMeals(data.meals ?? []);
          setMealsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, start]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "meal-added"; meal: MealDTO }
        | { type: "meal-removed"; mealId: string }
        | { type: string };

      if (data.type === "meal-added") {
        const meal = (data as { meal: MealDTO }).meal;
        if (meal.date >= start && meal.date < start + 7 * 24 * 60 * 60 * 1000) {
          setMeals((prev) => (prev.some((m) => m.id === meal.id) ? prev : [...prev, meal]));
        }
      } else if (data.type === "meal-removed") {
        const mealId = (data as { mealId: string }).mealId;
        setMeals((prev) => prev.filter((m) => m.id !== mealId));
      }
    };

    return () => source.close();
  }, [household, start]);

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
        pageTitle="Meal planner"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <WeekNav start={start} onChange={setStart} />
            <div className="border-t border-border pt-5">
              <AddMealForm household={household} weekStartValue={start} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">{weekLabel(start)}</h3>
              <span className="text-xs text-fg-subtle">{meals.length} planned</span>
            </div>

            <MealPlanList householdId={household.id} weekStartValue={start} meals={meals} loading={mealsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
