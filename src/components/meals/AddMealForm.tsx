"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { MEAL_TYPES } from "@/lib/mealMeta";
import { weekDays } from "./WeekNav";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { MealType, HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Member {
  uid: string;
  name: string;
}

export function AddMealForm({ household, weekStartValue }: { household: HouseholdDTO; weekStartValue: number }) {
  const householdId = household.id;
  const { profile } = useAuth();
  const toast = useToast();
  const days = weekDays(weekStartValue);

  const [date, setDate] = useState(days[0]);
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [description, setDescription] = useState("");
  const [assignedToUid, setAssignedToUid] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Resets the selected day when the viewed week changes, not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(weekDays(weekStartValue)[0]);
  }, [weekStartValue]);

  useEffect(() => {
    fetch(`/api/households/${householdId}/members`)
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [householdId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = description.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${householdId}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          description: trimmed,
          originalLang: sourceLang,
          translations,
          assignedToUid: assignedToUid || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that meal.");
        return;
      }
      setDescription("");
    } catch {
      toast.error("Couldn't add that meal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <select
          value={date}
          onChange={(e) => setDate(Number(e.target.value))}
          aria-label="Day"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {days.map((d, i) => (
            <option key={d} value={d} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {DAY_NAMES[i]}
            </option>
          ))}
        </select>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          aria-label="Meal type"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {MEAL_TYPES.map((m) => (
            <option key={m.value} value={m.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's cooking?"
        className={compactFieldClasses}
      />

      <select
        value={assignedToUid}
        onChange={(e) => setAssignedToUid(e.target.value)}
        aria-label="Who's cooking"
        className={compactFieldClasses}
      >
        <option value="" style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
          Whoever&apos;s around
        </option>
        {members.map((m) => (
          <option key={m.uid} value={m.uid} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
            {m.name}
          </option>
        ))}
      </select>

      <Button type="submit" disabled={submitting || !description.trim()} className="w-full">
        {submitting ? "Adding..." : "Add to plan"}
      </Button>
    </form>
  );
}
