import type { WithId } from "mongodb";
import type { GroceryItemDTO } from "@/lib/types";

export interface GroceryItemDoc {
  householdId: string;
  originalText: string;
  originalLang: string;
  translations: Record<string, string>;
  quantity: number;
  unit: string;
  category: string;
  note: string | null;
  noteTranslations: Record<string, string> | null;
  addedByUid: string;
  addedByName: string;
  purchasedAt: number | null;
  purchasedByUid: string | null;
  createdAt: number;
}

export function toGroceryItemDTO(doc: WithId<GroceryItemDoc>): GroceryItemDTO {
  return {
    id: doc._id.toHexString(),
    originalText: doc.originalText,
    originalLang: doc.originalLang,
    translations: doc.translations,
    quantity: doc.quantity,
    unit: doc.unit,
    category: doc.category,
    note: doc.note ?? null,
    noteTranslations: doc.noteTranslations ?? null,
    addedByUid: doc.addedByUid,
    addedByName: doc.addedByName,
    purchasedAt: doc.purchasedAt ?? null,
    purchasedByUid: doc.purchasedByUid ?? null,
    createdAt: doc.createdAt,
  };
}
