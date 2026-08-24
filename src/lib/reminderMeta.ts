import type { ReminderRecurrence, ReminderKind } from "@/lib/types";

export const REMINDER_RECURRENCES: { value: ReminderRecurrence; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const REMINDER_KINDS: { value: ReminderKind; label: string; colorVar: string }[] = [
  { value: "bill", label: "Bill", colorVar: "cat-amber" },
  { value: "birthday", label: "Birthday", colorVar: "cat-rose" },
  { value: "appointment", label: "Appointment", colorVar: "cat-blue" },
  { value: "other", label: "Other", colorVar: "cat-neutral" },
];

export function reminderRecurrenceLabel(value: ReminderRecurrence): string {
  return REMINDER_RECURRENCES.find((r) => r.value === value)?.label ?? value;
}

export function reminderKindMeta(value: ReminderKind) {
  return REMINDER_KINDS.find((k) => k.value === value) ?? REMINDER_KINDS[3];
}
