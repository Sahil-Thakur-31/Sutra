"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddWordForm } from "@/components/words/AddWordForm";
import { WordList } from "@/components/words/WordList";
import type { WordDTO } from "@/lib/types";

export default function WordsPage() {
  const { profile, household, loading } = useHousehold();
  const [words, setWords] = useState<WordDTO[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!household) return;
    fetch(`/api/households/${household.id}/words`)
      .then((res) => res.json())
      .then((data) => {
        setWords(data.words ?? []);
        setWordsLoading(false);
      });
  }, [household]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Word corner"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddWordForm household={household} onAdded={refetch} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">Family vocabulary</h3>
              <span className="text-xs text-fg-subtle">{words.length} shared</span>
            </div>

            <WordList householdId={household.id} words={words} loading={wordsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
