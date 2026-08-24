import type { MealType } from "@/lib/types";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export function mealTypeLabel(value: MealType): string {
  return MEAL_TYPES.find((m) => m.value === value)?.label ?? value;
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function dayLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const dow = d.getDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return `${DAY_LABELS[idx]}, ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
