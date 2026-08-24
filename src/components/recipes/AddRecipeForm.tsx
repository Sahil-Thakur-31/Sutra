"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { translateForHousehold } from "@/lib/translateForHousehold";
import { Button } from "@/components/ui/Button";
import type { HouseholdDTO, RecipeDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddRecipeForm({
  household,
  onCreated,
}: {
  household: HouseholdDTO;
  onCreated: (recipe: RecipeDTO) => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmedTitle = title.trim();
    const trimmedIngredients = ingredients.trim();
    const trimmedSteps = steps.trim();
    if (!trimmedTitle || !trimmedIngredients || !trimmedSteps) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const [titleT, ingredientsT, stepsT] = await Promise.all([
        translateForHousehold(trimmedTitle, sourceLang, household),
        translateForHousehold(trimmedIngredients, sourceLang, household),
        translateForHousehold(trimmedSteps, sourceLang, household),
      ]);

      const res = await fetch(`/api/households/${household.id}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          originalLang: sourceLang,
          translations: titleT,
          ingredients: trimmedIngredients,
          ingredientsTranslations: ingredientsT,
          steps: trimmedSteps,
          stepsTranslations: stepsT,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save that recipe.");
        return;
      }
      onCreated(data.recipe);
      setTitle("");
      setIngredients("");
      setSteps("");
      toast.success("Recipe saved!");
    } catch {
      toast.error("Couldn't save that recipe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Recipe name"
        className={compactFieldClasses}
      />
      <textarea
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        placeholder="Ingredients, one per line"
        rows={4}
        className={compactFieldClasses}
      />
      <textarea
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        placeholder="Steps"
        rows={4}
        className={compactFieldClasses}
      />
      <Button
        type="submit"
        disabled={submitting || !title.trim() || !ingredients.trim() || !steps.trim()}
        className="w-full"
      >
        {submitting ? "Saving..." : "Save recipe"}
      </Button>
    </form>
  );
}
