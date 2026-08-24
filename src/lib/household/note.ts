import type { WithId } from "mongodb";
import type { NoteDTO } from "@/lib/types";

export interface NoteDoc {
  householdId: string;
  text: string;
  originalLang: string;
  translations: Record<string, string>;
  color: string;
  pinned: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toNoteDTO(doc: WithId<NoteDoc>): NoteDTO {
  return {
    id: doc._id.toHexString(),
    text: doc.text,
    originalLang: doc.originalLang,
    translations: doc.translations,
    color: doc.color,
    pinned: doc.pinned,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}
