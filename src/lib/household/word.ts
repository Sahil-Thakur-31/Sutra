import type { WithId } from "mongodb";
import type { WordDTO } from "@/lib/types";

export interface WordDoc {
  householdId: string;
  phrase: string;
  originalLang: string;
  translations: Record<string, string>;
  addedByUid: string;
  addedByName: string;
  learnedByUids: string[];
  createdAt: number;
}

export function toWordDTO(doc: WithId<WordDoc>): WordDTO {
  return {
    id: doc._id.toHexString(),
    phrase: doc.phrase,
    originalLang: doc.originalLang,
    translations: doc.translations,
    addedByUid: doc.addedByUid,
    addedByName: doc.addedByName,
    learnedByUids: doc.learnedByUids,
    createdAt: doc.createdAt,
  };
}
