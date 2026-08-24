"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddMovieForm({ householdId }: { householdId: string }) {
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
      const res = await fetch(`/api/households/${householdId}/movies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: profile.preferredLanguage,
          // Deliberately not machine-translated, unlike every other
          // user-authored field in the app: movie/show titles are proper
          // nouns, and an auto-translation is more likely to invent a wrong
          // "official" title than to help.
          translations: { [profile.preferredLanguage]: trimmed },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that movie.");
        return;
      }
      setTitle("");
    } catch {
      toast.error("Couldn't add that movie. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Suggest a movie or show"
        className={`min-w-0 flex-1 ${compactFieldClasses}`}
      />
      <Button type="submit" disabled={submitting || !title.trim()}>
        {submitting ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}
