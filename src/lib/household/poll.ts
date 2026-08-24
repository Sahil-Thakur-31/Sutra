import type { WithId } from "mongodb";
import type { PollDTO, PollOption } from "@/lib/types";

export interface PollDoc {
  householdId: string;
  question: string;
  originalLang: string;
  translations: Record<string, string>;
  options: PollOption[];
  closed: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toPollDTO(doc: WithId<PollDoc>): PollDTO {
  return {
    id: doc._id.toHexString(),
    question: doc.question,
    originalLang: doc.originalLang,
    translations: doc.translations,
    options: doc.options,
    closed: doc.closed,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}
