"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import type { HouseholdDTO } from "@/lib/types";

export function AddWordForm({ household, onAdded }: { household: HouseholdDTO; onAdded: () => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = phrase.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const targetLangs = Array.from(new Set(Object.values(household.memberLanguages)));

      const translateRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, sourceLang, targetLangs }),
      });
      const translateData = await translateRes.json();
      const translations: Record<string, string> = translateRes.ok
        ? translateData.translations
        : { [sourceLang]: trimmed };

      const res = await fetch(`/api/households/${household.id}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: trimmed, originalLang: sourceLang, translations }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that word.");
        return;
      }
      setPhrase("");
      onAdded();
    } catch {
      toast.error("Couldn't add that word. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <p className="text-xs text-fg-subtle">Teach the family a word or phrase in your language.</p>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder="A word or phrase..."
        className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft"
      />
      <Button type="submit" disabled={submitting || !phrase.trim()} className="w-full">
        {submitting ? "Adding..." : "Share a word"}
      </Button>
    </form>
  );
}
