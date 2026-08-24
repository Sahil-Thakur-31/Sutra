"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { AddEventForm } from "@/components/calendar/AddEventForm";
import { MonthNav, monthKey } from "@/components/grocery/MonthNav";
import { TrashIcon, CalendarDaysIcon, SpinnerIcon } from "@/components/ui/icons";
import type { CalendarEventDTO } from "@/lib/types";

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function CalendarPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(Date.now()));
  const [events, setEvents] = useState<CalendarEventDTO[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the skeleton on month change, not a render loop
    setEventsLoading(true);
    fetch(`/api/households/${household.id}/events?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setEvents(data.events ?? []);
          setEventsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, month]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "event-added"; event: CalendarEventDTO }
        | { type: "event-removed"; eventId: string }
        | { type: string };

      if (data.type === "event-added") {
        const newEvent = (data as { event: CalendarEventDTO }).event;
        if (monthKey(new Date(newEvent.date)) === month) {
          setEvents((prev) => (prev.some((e) => e.id === newEvent.id) ? prev : [...prev, newEvent]));
        }
      } else if (data.type === "event-removed") {
        const eventId = (data as { eventId: string }).eventId;
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    };

    return () => source.close();
  }, [household, month]);

  async function removeEvent(event: CalendarEventDTO) {
    if (!household) return;
    const displayText = event.translations?.[profile?.preferredLanguage ?? "en"] ?? event.title;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(event.id);
    try {
      const res = await fetch(`/api/households/${household.id}/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that event.");
    } catch {
      toast.error("Couldn't remove that event.");
    } finally {
      deleting.stop(event.id);
    }
  }

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  const myLang = profile.preferredLanguage;
  const selectedDayEvents = events.filter((e) => e.date === selectedDate).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Family calendar"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <div>
              <p className="mb-2 text-sm font-medium text-fg-muted">
                {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-fg-subtle">Nothing on the calendar for this day yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {selectedDayEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 rounded-lg bg-bg px-2.5 py-1.5">
                      {e.time && <span className="shrink-0 text-xs font-medium text-accent">{e.time}</span>}
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{e.translations?.[myLang] ?? e.title}</span>
                      <button
                        onClick={() => removeEvent(e)}
                        disabled={deleting.has(e.id)}
                        aria-label="Remove event"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                      >
                        {deleting.has(e.id) ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border pt-5">
              <AddEventForm household={household} date={selectedDate} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="size-4 text-fg-subtle" />
                <span className="text-xs text-fg-subtle">
                  {events.length} event{events.length === 1 ? "" : "s"} this month
                </span>
              </div>
              <MonthNav month={month} onChange={setMonth} allowFuture />
            </div>

            {eventsLoading ? (
              <div className="h-96 animate-shimmer rounded-2xl" />
            ) : (
              <CalendarGrid monthKey={month} events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
