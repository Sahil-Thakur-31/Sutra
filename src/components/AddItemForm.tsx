"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { UNITS, CATEGORIES } from "@/lib/groceryMeta";
import type { HouseholdDTO, ItemSuggestionDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

async function translateText(text: string, sourceLang: string, targetLangs: string[]): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceLang, targetLangs }),
    });
    const data = await res.json();
    return res.ok ? data.translations : { [sourceLang]: text };
  } catch {
    return { [sourceLang]: text };
  }
}

export function AddItemForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<string>("pcs");
  const [category, setCategory] = useState<string>("other");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState<ItemSuggestionDTO[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch(`/api/households/${household.id}/items/suggestions`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [household.id]);

  useEffect(() => {
    if (!showSuggestions) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showSuggestions]);

  const matches =
    name.trim().length > 0
      ? suggestions.filter((s) => s.originalText.toLowerCase().includes(name.trim().toLowerCase())).slice(0, 5)
      : [];

  function pickSuggestion(s: ItemSuggestionDTO) {
    setName(s.originalText);
    setQuantity(s.quantity);
    setUnit(s.unit);
    setCategory(s.category);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setShowSuggestions(false);
    try {
      const sourceLang = profile.preferredLanguage;
      const targetLangs = Array.from(new Set(Object.values(household.memberLanguages)));

      const translations = await translateText(trimmed, sourceLang, targetLangs);
      const trimmedNote = note.trim();
      const noteTranslations = trimmedNote ? await translateText(trimmedNote, sourceLang, targetLangs) : undefined;

      const res = await fetch(`/api/households/${household.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: trimmed,
          originalLang: sourceLang,
          translations,
          quantity,
          unit,
          category,
          note: trimmedNote || undefined,
          noteTranslations,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that item.");
        return;
      }

      // Make the just-added item available as a suggestion immediately,
      // instead of waiting for a future remount to refetch the list.
      setSuggestions((prev) => [
        { originalText: trimmed, originalLang: sourceLang, quantity, unit, category },
        ...prev.filter((s) => s.originalText.toLowerCase() !== trimmed.toLowerCase()),
      ]);

      setName("");
      setQuantity(1);
      setUnit("pcs");
      setCategory("other");
      setNote("");
      setShowNote(false);
    } catch {
      toast.error("Couldn't add that item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={rootRef} onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Add an item, e.g. milk"
          className={`w-full ${compactFieldClasses}`}
        />
        <AnimatePresence>
          {showSuggestions && matches.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-[0_8px_24px_-8px_rgb(var(--shadow-color)/0.3)]"
            >
              {matches.map((s) => (
                <li key={s.originalText}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-accent-soft/50"
                  >
                    <span className="truncate">{s.originalText}</span>
                    <CategoryChip category={s.category} />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          aria-label="Quantity"
          className={`w-16 shrink-0 ${compactFieldClasses}`}
        />

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Unit"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {UNITS.map((u) => (
            <option key={u} value={u} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
              {u}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
          className={`min-w-0 flex-1 ${compactFieldClasses}`}
        >
          {CATEGORIES.map((c) => (
            <option
              key={c.value}
              value={c.value}
              style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}
            >
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {showNote && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note, e.g. the full-fat one"
          className={compactFieldClasses}
        />
      )}

      <Button type="submit" disabled={submitting || !name.trim()} className="w-full">
        {submitting ? "Adding..." : "Add item"}
      </Button>

      {!showNote && (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="self-start text-xs font-medium text-accent hover:text-accent-hover"
        >
          + Add a note
        </button>
      )}
    </form>
  );
}
