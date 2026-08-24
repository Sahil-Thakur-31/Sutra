import type { WithId } from "mongodb";
import type { ChoreDTO, ChoreCompletionDTO, ChoreRecurrence } from "@/lib/types";
import { startOfDay, nextOccurrence } from "@/lib/recurrence";

export { startOfDay };

export interface ChoreDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  recurrence: ChoreRecurrence;
  assigneeUid: string | null;
  assigneeName: string | null;
  dueDate: number;
  status: "pending" | "done";
  completedByUid: string | null;
  completedByName: string | null;
  completedAt: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toChoreDTO(doc: WithId<ChoreDoc>): ChoreDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    recurrence: doc.recurrence,
    assigneeUid: doc.assigneeUid,
    assigneeName: doc.assigneeName,
    dueDate: doc.dueDate,
    status: doc.status,
    completedByUid: doc.completedByUid,
    completedByName: doc.completedByName,
    completedAt: doc.completedAt,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

export interface ChoreCompletionDoc {
  householdId: string;
  choreId: string;
  title: string;
  translations: Record<string, string>;
  completedByUid: string;
  completedByName: string;
  completedAt: number;
}

export function toChoreCompletionDTO(doc: WithId<ChoreCompletionDoc>): ChoreCompletionDTO {
  return {
    id: doc._id.toHexString(),
    choreId: doc.choreId,
    title: doc.title,
    translations: doc.translations,
    completedByUid: doc.completedByUid,
    completedByName: doc.completedByName,
    completedAt: doc.completedAt,
  };
}

export function nextDueDate(current: number, recurrence: ChoreRecurrence): number {
  return nextOccurrence(current, recurrence);
}
