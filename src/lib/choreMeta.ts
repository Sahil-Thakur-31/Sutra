import type { ChoreRecurrence } from "@/lib/types";

export const RECURRENCES: { value: ChoreRecurrence; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function recurrenceLabel(value: ChoreRecurrence): string {
  return RECURRENCES.find((r) => r.value === value)?.label ?? value;
}
