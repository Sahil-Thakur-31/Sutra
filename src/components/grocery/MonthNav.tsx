"use client";

import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "@/components/ui/icons";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKey(date);
}

export function MonthNav({
  month,
  onChange,
  allowFuture = false,
}: {
  month: string;
  onChange: (month: string) => void;
  /** History views (grocery/chores/etc.) can't go past the current month; a
   *  forward-looking calendar needs to, so this opts out of that limit. */
  allowFuture?: boolean;
}) {
  const isCurrentMonth = !allowFuture && month === monthKey(new Date());

  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-bg-elevated px-3 py-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="flex size-7 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent"
      >
        <ChevronLeftIcon className="size-4" />
      </motion.button>

      <span className="flex min-w-[9rem] items-center justify-center gap-1.5 text-sm font-medium text-fg">
        <CalendarIcon className="size-4 text-fg-subtle" />
        {monthLabel(month)}
      </span>

      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="flex size-7 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRightIcon className="size-4" />
      </motion.button>
    </div>
  );
}
