"use client";

import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "@/components/ui/icons";

const DAY_MS = 24 * 60 * 60 * 1000;

export function weekStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.getTime();
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Formatted manually rather than via toLocaleDateString: asking for
// day+year without month (the same-month case) makes some Intl
// implementations fall back to a verbose "(day: N)" style string instead of
// a normal date -- see the bug this fixed.
export function weekLabel(start: number): string {
  const startDate = new Date(start);
  const endDate = new Date(start + 6 * DAY_MS);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    return `${MONTH_ABBR[startDate.getMonth()]} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
  }
  return `${MONTH_ABBR[startDate.getMonth()]} ${startDate.getDate()} - ${MONTH_ABBR[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

export function shiftWeek(start: number, deltaWeeks: number): number {
  return start + deltaWeeks * 7 * DAY_MS;
}

export function weekDays(start: number): number[] {
  return Array.from({ length: 7 }, (_, i) => start + i * DAY_MS);
}

export function WeekNav({ start, onChange }: { start: number; onChange: (start: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-bg-elevated px-3 py-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(shiftWeek(start, -1))}
        aria-label="Previous week"
        className="flex size-7 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent"
      >
        <ChevronLeftIcon className="size-4" />
      </motion.button>

      <span className="flex min-w-[11rem] items-center justify-center gap-1.5 text-sm font-medium text-fg">
        <CalendarIcon className="size-4 text-fg-subtle" />
        {weekLabel(start)}
      </span>

      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(shiftWeek(start, 1))}
        aria-label="Next week"
        className="flex size-7 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent"
      >
        <ChevronRightIcon className="size-4" />
      </motion.button>
    </div>
  );
}
