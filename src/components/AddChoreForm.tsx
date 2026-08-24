"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { RECURRENCES } from "@/lib/choreMeta";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { ChoreRecurrence, HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

interface Member {
  uid: string;
  name: string;
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddChoreForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<ChoreRecurrence>("once");
  const [assigneeUid, setAssigneeUid] = useState("");
  const [dueDate, setDueDate] = useState(todayInputValue());
  const [members, setMembers] = useState<Member[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/households/${household.id}/members`)
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [household.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: sourceLang,
          translations,
          recurrence,
          assigneeUid: assigneeUid || null,
          dueDate: new Date(dueDate).getTime(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that chore.");
        return;
      }
      setTitle("");
      setRecurrence("once");
      setAssigneeUid("");
      setDueDate(todayInputValue());
    } catch {
      toast.error("Couldn't add that chore. Please try again.");
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
        placeholder="Add a chore, e.g. take out trash"
        className={compactFieldClasses}
      />

      <div className="flex gap-2">
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as ChoreRecurrence)}
          aria-label="Recurrence"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {RECURRENCES.map((r) => (
            <option key={r.value} value={r.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {r.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Due date"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        />
      </div>

      <select
        value={assigneeUid}
        onChange={(e) => setAssigneeUid(e.target.value)}
        aria-label="Assignee"
        className={compactFieldClasses}
      >
        <option value="" style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
          Anyone
        </option>
        {members.map((m) => (
          <option key={m.uid} value={m.uid} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
            {m.name}
          </option>
        ))}
      </select>

      <Button type="submit" disabled={submitting || !title.trim()} className="w-full">
        {submitting ? "Adding..." : "Add chore"}
      </Button>
    </form>
  );
}
