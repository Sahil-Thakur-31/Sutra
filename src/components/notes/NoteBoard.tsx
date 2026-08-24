"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, PinIcon, StickyNoteIcon, SpinnerIcon } from "@/components/ui/icons";
import { noteColorVar } from "@/lib/noteMeta";
import type { NoteDTO } from "@/lib/types";

function tiltFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return (hash / 1000) * 5 - 2.5;
}

export function NoteBoard({
  householdId,
  notes,
  loading,
}: {
  householdId: string;
  notes: NoteDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function togglePin(note: NoteDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) toast.error("Couldn't update that note.");
    } catch {
      toast.error("Couldn't update that note.");
    }
  }

  async function removeNote(note: NoteDTO) {
    const ok = await confirm({ title: "Remove this note?", confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(note.id);
    try {
      const res = await fetch(`/api/households/${householdId}/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that note.");
    } catch {
      toast.error("Couldn't remove that note.");
    } finally {
      deleting.stop(note.id);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <StickyNoteIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">No notes pinned yet.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <AnimatePresence initial={false}>
        {notes.map((note) => {
          const displayText = note.translations?.[myLang] ?? note.text;
          const colorVar = noteColorVar(note.color);
          const tilt = tiltFor(note.id);

          return (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: tilt }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col gap-2 rounded-xl p-3.5 shadow-[0_4px_12px_-4px_rgb(var(--shadow-color)/0.3)]"
              style={{ backgroundColor: `var(--color-${colorVar}-soft)` }}
            >
              <p className="min-h-12 flex-1 text-sm whitespace-pre-wrap" style={{ color: `var(--color-${colorVar})` }}>
                {displayText}
              </p>
              <div className="flex items-center justify-between text-xs" style={{ color: `var(--color-${colorVar})` }}>
                <span className="truncate opacity-80">{note.createdByName}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePin(note)}
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    className={`flex size-6 items-center justify-center rounded-full transition-opacity hover:opacity-70 ${note.pinned ? "opacity-100" : "opacity-40"}`}
                  >
                    <PinIcon className="size-3.5" />
                  </button>
                  <button
                    onClick={() => removeNote(note)}
                    disabled={deleting.has(note.id)}
                    aria-label="Remove note"
                    className="flex size-6 items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-90 disabled:pointer-events-none"
                  >
                    {deleting.has(note.id) ? (
                      <SpinnerIcon className="size-3.5 animate-spin" />
                    ) : (
                      <TrashIcon className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
