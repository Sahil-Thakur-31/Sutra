"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CategoryFilterChip } from "@/components/ui/CategoryChip";
import { Button } from "@/components/ui/Button";
import { SearchIcon, SortIcon, ListCheckIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { CATEGORIES } from "@/lib/groceryMeta";

export type SortOption = "newest" | "category" | "addedBy";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  category: "Category",
  addedBy: "Added by",
};

interface GroceryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeCategories: Set<string>;
  onToggleCategory: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
}

export function GroceryToolbar({
  search,
  onSearchChange,
  activeCategories,
  onToggleCategory,
  sortBy,
  onSortChange,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  onBulkDelete,
}: GroceryToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search items..."
          className="w-full rounded-xl border border-border bg-bg py-2 pr-3 pl-9 text-sm text-fg outline-none transition-shadow placeholder:text-fg-subtle focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort by"
            className="w-full appearance-none rounded-xl border border-border bg-bg py-2 pr-8 pl-8 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <option
                key={opt}
                value={opt}
                style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}
              >
                {SORT_LABELS[opt]}
              </option>
            ))}
          </select>
          <SortIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
        </div>

        <button
          type="button"
          onClick={onToggleSelectMode}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            selectMode ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:text-fg"
          }`}
        >
          <ListCheckIcon className="size-4" />
          Select
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-subtle">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <CategoryFilterChip
              key={c.value}
              category={c.value}
              active={activeCategories.has(c.value)}
              onClick={() => onToggleCategory(c.value)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between rounded-xl bg-accent-soft px-4 py-2.5"
          >
            <span className="text-sm font-medium text-accent">{selectedCount} selected</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                onClick={onToggleSelectMode}
              >
                <XIcon className="size-3.5" /> Cancel
              </Button>
              <Button
                type="button"
                className="!bg-danger !px-3 !py-1.5 !text-xs hover:!bg-danger"
                disabled={selectedCount === 0}
                onClick={onBulkDelete}
              >
                <TrashIcon className="size-3.5" /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
