import type { WithId } from "mongodb";
import type { ReminderDTO, ReminderLogDTO, ReminderRecurrence, ReminderKind } from "@/lib/types";
import { nextOccurrence } from "@/lib/recurrence";

export interface ReminderDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  kind: ReminderKind;
  recurrence: ReminderRecurrence;
  dueDate: number;
  status: "pending" | "done";
  dismissedByUid: string | null;
  dismissedByName: string | null;
  dismissedAt: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toReminderDTO(doc: WithId<ReminderDoc>): ReminderDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    kind: doc.kind,
    recurrence: doc.recurrence,
    dueDate: doc.dueDate,
    status: doc.status,
    dismissedByUid: doc.dismissedByUid,
    dismissedByName: doc.dismissedByName,
    dismissedAt: doc.dismissedAt,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

export interface ReminderLogDoc {
  householdId: string;
  reminderId: string;
  title: string;
  translations: Record<string, string>;
  dismissedByUid: string;
  dismissedByName: string;
  dismissedAt: number;
}

export function toReminderLogDTO(doc: WithId<ReminderLogDoc>): ReminderLogDTO {
  return {
    id: doc._id.toHexString(),
    reminderId: doc.reminderId,
    title: doc.title,
    translations: doc.translations,
    dismissedByUid: doc.dismissedByUid,
    dismissedByName: doc.dismissedByName,
    dismissedAt: doc.dismissedAt,
  };
}

export function nextReminderDate(current: number, recurrence: ReminderRecurrence): number {
  return nextOccurrence(current, recurrence);
}
