import type { WithId } from "mongodb";
import type { HabitDTO } from "@/lib/types";
import { startOfDay } from "@/lib/recurrence";

export interface HabitDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  ownerUid: string;
  ownerName: string;
  createdAt: number;
}

export interface HabitCheckinDoc {
  householdId: string;
  habitId: string;
  date: number;
  checkedByUid: string;
  checkedByName: string;
  createdAt: number;
}

const ONE_DAY = 24 * 60 * 60 * 1000;
export const HABIT_HISTORY_DAYS = 14;

export function computeStreak(checkinDates: Set<number>, today: number): number {
  let streak = 0;
  let cursor = checkinDates.has(today) ? today : today - ONE_DAY;
  while (checkinDates.has(cursor)) {
    streak++;
    cursor -= ONE_DAY;
  }
  return streak;
}

export function toHabitDTO(doc: WithId<HabitDoc>, checkinDates: number[]): HabitDTO {
  const today = startOfDay(Date.now());
  const dateSet = new Set(checkinDates);
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    ownerUid: doc.ownerUid,
    ownerName: doc.ownerName,
    recentCheckins: checkinDates,
    currentStreak: computeStreak(dateSet, today),
    createdAt: doc.createdAt,
  };
}
