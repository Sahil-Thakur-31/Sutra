import type { WithId } from "mongodb";
import type { RecipeDTO } from "@/lib/types";

export interface RecipeDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  ingredients: string;
  ingredientsTranslations: Record<string, string>;
  steps: string;
  stepsTranslations: Record<string, string>;
  addedByUid: string;
  addedByName: string;
  createdAt: number;
}

export function toRecipeDTO(doc: WithId<RecipeDoc>): RecipeDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    ingredients: doc.ingredients,
    ingredientsTranslations: doc.ingredientsTranslations,
    steps: doc.steps,
    stepsTranslations: doc.stepsTranslations,
    addedByUid: doc.addedByUid,
    addedByName: doc.addedByName,
    createdAt: doc.createdAt,
  };
}
