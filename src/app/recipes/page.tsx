"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddRecipeForm } from "@/components/recipes/AddRecipeForm";
import { RecipePicker } from "@/components/recipes/RecipePicker";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { UtensilsIcon } from "@/components/ui/icons";
import type { RecipeDTO } from "@/lib/types";

export default function RecipesPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();
  const confirm = useConfirm();
  const deletingRecipe = usePendingSet();
  const [recipes, setRecipes] = useState<RecipeDTO[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/recipes`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: RecipeDTO[] = data.recipes ?? [];
        setRecipes(list);
        setRecipesLoading(false);
        if (list.length > 0) setSelectedId((cur) => cur ?? list[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  function handleRecipeCreated(recipe: RecipeDTO) {
    setRecipes((prev) => [recipe, ...prev]);
    setSelectedId(recipe.id);
  }

  async function handleRecipeDelete(recipe: RecipeDTO) {
    if (!household) return;
    const displayTitle = recipe.translations?.[profile?.preferredLanguage ?? "en"] ?? recipe.title;
    const ok = await confirm({ title: `Delete "${displayTitle}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deletingRecipe.start(recipe.id);
    try {
      const res = await fetch(`/api/households/${household.id}/recipes/${recipe.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete that recipe.");
        return;
      }
      setRecipes((prev) => {
        const next = prev.filter((r) => r.id !== recipe.id);
        if (selectedId === recipe.id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      toast.error("Couldn't delete that recipe.");
    } finally {
      deletingRecipe.stop(recipe.id);
    }
  }

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  const selectedRecipe = recipes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Recipe box"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            {recipesLoading ? (
              <div className="h-10 animate-shimmer rounded-xl" />
            ) : (
              <RecipePicker
                recipes={recipes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDelete={handleRecipeDelete}
                isDeleting={deletingRecipe.has}
              />
            )}
            <div className="border-t border-border pt-4">
              <AddRecipeForm household={household} onCreated={handleRecipeCreated} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            {selectedRecipe ? (
              <RecipeDetail recipe={selectedRecipe} />
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <UtensilsIcon className="size-5" />
                </div>
                <p className="text-sm text-fg-muted">Save your first family recipe.</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
