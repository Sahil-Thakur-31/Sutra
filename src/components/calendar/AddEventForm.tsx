"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddEventForm({ household, date }: { household: HouseholdDTO; date: number }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
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

      const res = await fetch(`/api/households/${household.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: sourceLang,
          translations,
          date,
          time: time || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that event.");
        return;
      }
      setTitle("");
      setTime("");
    } catch {
      toast.error("Couldn't add that event. Please try again.");
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
        placeholder="Add an event"
        className={compactFieldClasses}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="Time (optional)"
        className={compactFieldClasses}
      />
      <Button type="submit" disabled={submitting || !title.trim()} className="w-full">
        {submitting ? "Adding..." : "Add event"}
      </Button>
    </form>
  );
}
