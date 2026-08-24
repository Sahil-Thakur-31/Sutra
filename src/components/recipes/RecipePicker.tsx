"use client";

import { useAuth } from "@/contexts/AuthContext";
import { UtensilsIcon, TrashIcon, SpinnerIcon } from "@/components/ui/icons";
import type { RecipeDTO } from "@/lib/types";

export function RecipePicker({
  recipes,
  selectedId,
  onSelect,
  onDelete,
  isDeleting,
}: {
  recipes: RecipeDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (recipe: RecipeDTO) => void;
  isDeleting: (id: string) => boolean;
}) {
  const { profile } = useAuth();
  const myLang = profile?.preferredLanguage ?? "en";

  if (recipes.length === 0) {
    return <p className="text-xs text-fg-subtle">No recipes yet — add one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {recipes.map((recipe) => {
        const displayTitle = recipe.translations?.[myLang] ?? recipe.title;
        const active = recipe.id === selectedId;
        const deleting = isDeleting(recipe.id);
        return (
          <li key={recipe.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(recipe.id)}
              className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                active ? "bg-accent-soft text-accent font-medium" : "text-fg-muted hover:bg-bg"
              }`}
            >
              <UtensilsIcon className="size-4 shrink-0" />
              <span className="truncate">{displayTitle}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(recipe)}
              disabled={deleting}
              aria-label="Delete recipe"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-fg-subtle opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-100"
            >
              {deleting ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
