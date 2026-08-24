"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

export function AddHabitForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
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

      const res = await fetch(`/api/households/${household.id}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: sourceLang,
          translations,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that habit.");
        return;
      }
      setTitle("");
    } catch {
      toast.error("Couldn't add that habit. Please try again.");
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
        placeholder="A habit to track, e.g. drink water"
        className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft"
      />
      <Button type="submit" disabled={submitting || !title.trim()} className="w-full">
        {submitting ? "Adding..." : "Add habit"}
      </Button>
    </form>
  );
}
