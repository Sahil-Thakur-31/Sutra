"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Checkbox } from "@/components/ui/Checkbox";
import { TrashIcon, SpinnerIcon } from "@/components/ui/icons";
import { languageLabel } from "@/lib/languages";
import type { WordDTO } from "@/lib/types";

export function WordList({
  householdId,
  words,
  loading,
}: {
  householdId: string;
  words: WordDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function toggleLearned(word: WordDTO) {
    if (!profile) return;
    const learned = !word.learnedByUids.includes(profile.uid);
    try {
      const res = await fetch(`/api/households/${householdId}/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learned }),
      });
      if (!res.ok) toast.error("Couldn't update that word.");
    } catch {
      toast.error("Couldn't update that word.");
    }
  }

  async function removeWord(word: WordDTO) {
    const displayText = word.translations?.[profile?.preferredLanguage ?? "en"] ?? word.phrase;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(word.id);
    try {
      const res = await fetch(`/api/households/${householdId}/words/${word.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that word.");
    } catch {
      toast.error("Couldn't remove that word.");
    } finally {
      deleting.stop(word.id);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-fg-muted">No words shared yet.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {words.map((word) => {
          const displayText = word.translations?.[myLang] ?? word.phrase;
          const showOriginal = word.originalLang !== myLang;
          const learned = profile ? word.learnedByUids.includes(profile.uid) : false;

          return (
            <motion.li
              key={word.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
            >
              <Checkbox checked={learned} onChange={() => toggleLearned(word)} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${learned ? "text-fg-subtle" : "text-fg"}`}>{displayText}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {showOriginal && `"${word.phrase}" (${languageLabel(word.originalLang)}) · `}
                  from {word.addedByName}
                </p>
              </div>
              <button
                onClick={() => removeWord(word)}
                disabled={deleting.has(word.id)}
                aria-label="Remove word"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(word.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
