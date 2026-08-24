"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddChoreForm } from "@/components/AddChoreForm";
import { ChoreList } from "@/components/ChoreList";
import { Avatar } from "@/components/ui/Avatar";
import { MonthNav, monthKey, monthLabel } from "@/components/grocery/MonthNav";
import type { ChoreDTO, ChoreCompletionDTO } from "@/lib/types";

type Tab = "active" | "history";

export default function ChoresPage() {
  const { profile, household, loading } = useHousehold();

  const [tab, setTab] = useState<Tab>("active");
  const [chores, setChores] = useState<ChoreDTO[]>([]);
  const [choresLoading, setChoresLoading] = useState(true);

  const [historyMonth, setHistoryMonth] = useState(() => monthKey(new Date()));
  const [completions, setCompletions] = useState<ChoreCompletionDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/chores`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setChores(data.chores ?? []);
          setChoresLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      // The SSE stream also carries grocery events, which fall through
      // untouched since none of the branches below match their `type`.
      const data = JSON.parse(event.data) as
        | { type: "chore-added"; chore: ChoreDTO }
        | { type: "chore-updated"; chore: ChoreDTO }
        | { type: "chore-removed"; choreId: string }
        | { type: "item-added" | "item-updated" | "item-removed" };

      if (data.type === "chore-added") {
        setChores((prev) => (prev.some((c) => c.id === data.chore.id) ? prev : [...prev, data.chore]));
      } else if (data.type === "chore-updated") {
        setChores((prev) => {
          if (data.chore.status === "done") return prev.filter((c) => c.id !== data.chore.id);
          if (!prev.some((c) => c.id === data.chore.id)) return [...prev, data.chore];
          return prev.map((c) => (c.id === data.chore.id ? data.chore : c));
        });
      } else if (data.type === "chore-removed") {
        setChores((prev) => prev.filter((c) => c.id !== data.choreId));
      }
    };

    return () => source.close();
  }, [household]);

  useEffect(() => {
    if (!household || tab !== "history") return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/chores/history?month=${historyMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setCompletions(data.completions ?? []);
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, tab, historyMonth]);

  const sortedChores = [...chores].sort((a, b) => a.dueDate - b.dueDate);

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
        pageTitle="Chores"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <div className="flex rounded-xl bg-bg p-1 text-sm font-medium">
              {(["active", "history"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="relative flex-1 rounded-lg py-1.5 transition-colors"
                >
                  {tab === t && (
                    <motion.span
                      layoutId="chores-tab-pill"
                      className="absolute inset-0 rounded-lg bg-accent-soft shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-accent" : "text-fg-muted"}`}>
                    {t === "active" ? "Chores" : "History"}
                  </span>
                </button>
              ))}
            </div>

            {tab === "active" ? (
              <AddChoreForm household={household} />
            ) : (
              <MonthNav month={historyMonth} onChange={setHistoryMonth} />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">
                {tab === "active" ? "Chores" : `Completed in ${monthLabel(historyMonth)}`}
              </h3>
              <span className="text-xs text-fg-subtle">
                {tab === "active" ? `${sortedChores.length} active` : `${completions.length} done`}
              </span>
            </div>

            {tab === "active" ? (
              <ChoreList
                householdId={household.id}
                chores={sortedChores}
                loading={choresLoading}
                emptyMessage="No chores yet — add the first one."
              />
            ) : historyLoading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 animate-shimmer rounded-2xl" />
                ))}
              </div>
            ) : completions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-fg-muted">Nothing completed yet this month.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {completions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
                  >
                    <Avatar name={c.completedByName} className="size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{c.translations?.[profile.preferredLanguage] ?? c.title}</p>
                      <p className="truncate text-xs text-fg-subtle">
                        by {c.completedByName} · {new Date(c.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
