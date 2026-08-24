"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { NOTE_COLORS } from "@/lib/noteMeta";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

export function AddNoteForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [color, setColor] = useState("amber");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          originalLang: sourceLang,
          translations,
          color,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that note.");
        return;
      }
      setText("");
    } catch {
      toast.error("Couldn't add that note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Pin a note for the family..."
        rows={3}
        className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft"
      />
      <div className="flex items-center gap-1.5">
        {NOTE_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            aria-label={c.value}
            className={`size-6 rounded-full border-2 transition-transform ${color === c.value ? "scale-110 border-fg" : "border-transparent"}`}
            style={{ backgroundColor: `var(--color-${c.colorVar})` }}
          />
        ))}
      </div>
      <Button type="submit" disabled={submitting || !text.trim()} className="w-full">
        {submitting ? "Pinning..." : "Pin note"}
      </Button>
    </form>
  );
}
