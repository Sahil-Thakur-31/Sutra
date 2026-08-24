"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { TrashIcon, LuggageIcon, SpinnerIcon } from "@/components/ui/icons";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { PackingItemDTO, HouseholdDTO } from "@/lib/types";

interface PackingListProps {
  household: HouseholdDTO;
  tripId: string;
  items: PackingItemDTO[];
  loading: boolean;
  onItemAdded: (item: PackingItemDTO) => void;
  onItemUpdated: (item: PackingItemDTO) => void;
  onItemRemoved: (itemId: string) => void;
}

export function PackingList({
  household,
  tripId,
  items,
  loading,
  onItemAdded,
  onItemUpdated,
  onItemRemoved,
}: PackingListProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const householdId = household.id;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${householdId}/trips/${tripId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          originalLang: sourceLang,
          translations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add that item.");
        return;
      }
      onItemAdded(data.item);
      setText("");
    } catch {
      toast.error("Couldn't add that item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePacked(item: PackingItemDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/trips/${tripId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packed: !item.packed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Couldn't update that item.");
        return;
      }
      onItemUpdated(data.item);
    } catch {
      toast.error("Couldn't update that item.");
    }
  }

  async function removeItem(item: PackingItemDTO) {
    const displayText = item.translations?.[profile?.preferredLanguage ?? "en"] ?? item.text;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(item.id);
    try {
      const res = await fetch(`/api/households/${householdId}/trips/${tripId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Couldn't remove that item.");
        return;
      }
      onItemRemoved(item.id);
    } catch {
      toast.error("Couldn't remove that item.");
    } finally {
      deleting.stop(item.id);
    }
  }

  const myLang = profile?.preferredLanguage ?? "en";
  const packedCount = items.filter((i) => i.packed).length;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add something to pack..."
          className="flex-1 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
        />
        <Button type="submit" disabled={submitting || !text.trim()}>
          Add
        </Button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-fg-subtle">
          {packedCount} of {items.length} packed
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-shimmer rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <LuggageIcon className="size-5" />
          </div>
          <p className="text-sm text-fg-muted">Nothing on the packing list yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const displayText = item.translations?.[myLang] ?? item.text;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
                >
                  <Checkbox checked={item.packed} onChange={() => togglePacked(item)} />
                  <p className={`min-w-0 flex-1 truncate text-sm ${item.packed ? "text-fg-subtle line-through" : "text-fg"}`}>
                    {displayText}
                  </p>
                  <button
                    onClick={() => removeItem(item)}
                    disabled={deleting.has(item.id)}
                    aria-label="Remove item"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                  >
                    {deleting.has(item.id) ? (
                      <SpinnerIcon className="size-4 animate-spin" />
                    ) : (
                      <TrashIcon className="size-4" />
                    )}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
