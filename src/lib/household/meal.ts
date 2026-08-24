import type { WithId } from "mongodb";
import type { MealDTO, MealType } from "@/lib/types";

export interface MealDoc {
  householdId: string;
  date: number;
  mealType: MealType;
  description: string;
  originalLang: string;
  translations: Record<string, string>;
  assignedToUid: string | null;
  assignedToName: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toMealDTO(doc: WithId<MealDoc>): MealDTO {
  return {
    id: doc._id.toHexString(),
    date: doc.date,
    mealType: doc.mealType,
    description: doc.description,
    originalLang: doc.originalLang,
    translations: doc.translations,
    assignedToUid: doc.assignedToUid,
    assignedToName: doc.assignedToName,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}
