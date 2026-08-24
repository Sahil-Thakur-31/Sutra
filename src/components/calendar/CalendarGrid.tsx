"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CalendarEventDTO } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Cells for a Monday-first month grid, including the leading/trailing days
 *  from adjacent months needed to fill whole weeks. */
function buildGridDays(monthKey: string): { date: number; inMonth: boolean }[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const gridStart = firstOfMonth.getTime() - firstWeekday * DAY_MS;

  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const date = gridStart + i * DAY_MS;
    return { date, inMonth: new Date(date).getMonth() === month - 1 };
  });
}

export function CalendarGrid({
  monthKey,
  events,
  selectedDate,
  onSelectDate,
}: {
  monthKey: string;
  events: CalendarEventDTO[];
  selectedDate: number;
  onSelectDate: (date: number) => void;
}) {
  const days = buildGridDays(monthKey);
  // Computed once via a lazy initializer rather than on every render --
  // "today" doesn't need to tick live within a single page view.
  const [today] = useState(() => startOfDay(Date.now()));

  const eventsByDay = new Map<number, CalendarEventDTO[]>();
  for (const event of events) {
    const list = eventsByDay.get(event.date) ?? [];
    list.push(event);
    eventsByDay.set(event.date, list);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-7 bg-bg text-center text-xs font-medium text-fg-subtle">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map(({ date, inMonth }) => {
          const dayEvents = eventsByDay.get(date) ?? [];
          const isToday = date === today;
          const isSelected = date === selectedDate;

          return (
            <motion.button
              key={date}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectDate(date)}
              className={`flex min-h-20 flex-col items-start gap-1 p-1.5 text-left transition-colors ${
                isSelected ? "bg-accent-soft" : "bg-bg-elevated hover:bg-accent-soft/40"
              } ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-accent text-accent-fg font-semibold" : "text-fg-muted"
                }`}
              >
                {new Date(date).getDate()}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className="truncate rounded bg-accent-soft px-1 py-0.5 text-[10px] font-medium text-accent"
                  >
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] font-medium text-fg-subtle">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
