"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { REMINDER_RECURRENCES, REMINDER_KINDS } from "@/lib/reminderMeta";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { ReminderRecurrence, ReminderKind, HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddReminderForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ReminderKind>("other");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("once");
  const [dueDate, setDueDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: sourceLang,
          translations,
          kind,
          recurrence,
          dueDate: new Date(dueDate).getTime(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that reminder.");
        return;
      }
      setTitle("");
      setKind("other");
      setRecurrence("once");
      setDueDate(todayInputValue());
    } catch {
      toast.error("Couldn't add that reminder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a reminder, e.g. pay electricity bill"
        className={compactFieldClasses}
      />

      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ReminderKind)}
          aria-label="Kind"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {REMINDER_KINDS.map((k) => (
            <option key={k.value} value={k.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {k.label}
            </option>
          ))}
        </select>

        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
          aria-label="Recurrence"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {REMINDER_RECURRENCES.map((r) => (
            <option key={r.value} value={r.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        aria-label="Due date"
        className={compactFieldClasses}
      />

      <Button type="submit" disabled={submitting || !title.trim()} className="w-full">
        {submitting ? "Adding..." : "Add reminder"}
      </Button>
    </form>
  );
}
