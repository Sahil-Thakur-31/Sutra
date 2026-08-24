"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddWishlistItemForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
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

      const res = await fetch(`/api/households/${household.id}/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          originalLang: sourceLang,
          translations,
          url: url.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that item.");
        return;
      }
      setTitle("");
      setUrl("");
    } catch {
      toast.error("Couldn't add that item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <p className="text-xs text-fg-subtle">Adds to your own wishlist. Others can reserve it without you knowing.</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Something you'd like..."
        className={compactFieldClasses}
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link (optional)"
        className={compactFieldClasses}
      />
      <Button type="submit" disabled={submitting || !title.trim()} className="w-full">
        {submitting ? "Adding..." : "Add to my wishlist"}
      </Button>
    </form>
  );
}
