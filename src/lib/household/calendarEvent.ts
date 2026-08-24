import type { WithId } from "mongodb";
import type { CalendarEventDTO } from "@/lib/types";

export interface CalendarEventDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  date: number;
  time: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toCalendarEventDTO(doc: WithId<CalendarEventDoc>): CalendarEventDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    date: doc.date,
    time: doc.time,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}
