export type Recurrence = "once" | "daily" | "weekly" | "monthly" | "yearly";

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function nextOccurrence(current: number, recurrence: Recurrence): number {
  const d = new Date(current);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  else if (recurrence === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}
