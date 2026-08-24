"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddReminderForm } from "@/components/AddReminderForm";
import { ReminderList } from "@/components/ReminderList";
import { MonthNav, monthKey, monthLabel } from "@/components/grocery/MonthNav";
import type { ReminderDTO, ReminderLogDTO } from "@/lib/types";

type Tab = "active" | "history";

export default function RemindersPage() {
  const { profile, household, loading } = useHousehold();

  const [tab, setTab] = useState<Tab>("active");
  const [reminders, setReminders] = useState<ReminderDTO[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  const [historyMonth, setHistoryMonth] = useState(() => monthKey(new Date()));
  const [logs, setLogs] = useState<ReminderLogDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/reminders`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setReminders(data.reminders ?? []);
          setRemindersLoading(false);
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
      const data = JSON.parse(event.data) as
        | { type: "reminder-added"; reminder: ReminderDTO }
        | { type: "reminder-updated"; reminder: ReminderDTO }
        | { type: "reminder-removed"; reminderId: string }
        | { type: "item-added" | "item-updated" | "item-removed" | "chore-added" | "chore-updated" | "chore-removed" };

      if (data.type === "reminder-added") {
        setReminders((prev) => (prev.some((r) => r.id === data.reminder.id) ? prev : [...prev, data.reminder]));
      } else if (data.type === "reminder-updated") {
        setReminders((prev) => {
          if (data.reminder.status === "done") return prev.filter((r) => r.id !== data.reminder.id);
          if (!prev.some((r) => r.id === data.reminder.id)) return [...prev, data.reminder];
          return prev.map((r) => (r.id === data.reminder.id ? data.reminder : r));
        });
      } else if (data.type === "reminder-removed") {
        setReminders((prev) => prev.filter((r) => r.id !== data.reminderId));
      }
    };

    return () => source.close();
  }, [household]);

  useEffect(() => {
    if (!household || tab !== "history") return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/reminders/history?month=${historyMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setLogs(data.logs ?? []);
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, tab, historyMonth]);

  const sortedReminders = [...reminders].sort((a, b) => a.dueDate - b.dueDate);

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
        pageTitle="Reminders"
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
                      layoutId="reminders-tab-pill"
                      className="absolute inset-0 rounded-lg bg-accent-soft shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-accent" : "text-fg-muted"}`}>
                    {t === "active" ? "Reminders" : "History"}
                  </span>
                </button>
              ))}
            </div>

            {tab === "active" ? (
              <AddReminderForm household={household} />
            ) : (
              <MonthNav month={historyMonth} onChange={setHistoryMonth} />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">
                {tab === "active" ? "Reminders" : `Handled in ${monthLabel(historyMonth)}`}
              </h3>
              <span className="text-xs text-fg-subtle">
                {tab === "active" ? `${sortedReminders.length} active` : `${logs.length} handled`}
              </span>
            </div>

            {tab === "active" ? (
              <ReminderList
                householdId={household.id}
                reminders={sortedReminders}
                loading={remindersLoading}
                emptyMessage="No reminders yet — add the first one."
              />
            ) : historyLoading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 animate-shimmer rounded-2xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-fg-muted">Nothing handled yet this month.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{log.translations?.[profile.preferredLanguage] ?? log.title}</p>
                      <p className="truncate text-xs text-fg-subtle">
                        by {log.dismissedByName} · {new Date(log.dismissedAt).toLocaleDateString()}
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
