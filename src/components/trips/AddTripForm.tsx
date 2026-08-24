"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { TripDTO, HouseholdDTO } from "@/lib/types";

export function AddTripForm({ household, onCreated }: { household: HouseholdDTO; onCreated: (trip: TripDTO) => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          originalLang: sourceLang,
          translations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't create that trip.");
        return;
      }
      onCreated(data.trip);
      setName("");
    } catch {
      toast.error("Couldn't create that trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New trip, e.g. Goa weekend"
        className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft"
      />
      <Button type="submit" disabled={submitting || !name.trim()} className="w-full">
        {submitting ? "Creating..." : "New trip"}
      </Button>
    </form>
  );
}
