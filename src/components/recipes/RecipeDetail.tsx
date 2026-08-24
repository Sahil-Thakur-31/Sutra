"use client";

import { useAuth } from "@/contexts/AuthContext";
import { UtensilsIcon } from "@/components/ui/icons";
import type { RecipeDTO } from "@/lib/types";

export function RecipeDetail({ recipe }: { recipe: RecipeDTO }) {
  const { profile } = useAuth();
  const myLang = profile?.preferredLanguage ?? "en";

  const title = recipe.translations?.[myLang] ?? recipe.title;
  const ingredients = recipe.ingredientsTranslations?.[myLang] ?? recipe.ingredients;
  const steps = recipe.stepsTranslations?.[myLang] ?? recipe.steps;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <UtensilsIcon className="size-5 text-accent" />
        <h3 className="text-base font-semibold text-fg">{title}</h3>
      </div>

      <div className="rounded-2xl border border-border bg-bg-elevated p-5">
        <h4 className="text-sm font-medium text-fg-muted">Ingredients</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{ingredients}</p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-elevated p-5">
        <h4 className="text-sm font-medium text-fg-muted">Steps</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{steps}</p>
      </div>

      <p className="text-xs text-fg-subtle">Added by {recipe.addedByName}</p>
    </div>
  );
}
