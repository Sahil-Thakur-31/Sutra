"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Checkbox } from "@/components/ui/Checkbox";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { TrashIcon, BasketIcon, SpinnerIcon } from "@/components/ui/icons";
import type { GroceryItemDTO, HouseholdDTO } from "@/lib/types";

interface GroceryListProps {
  household: HouseholdDTO;
  items: GroceryItemDTO[];
  loading: boolean;
  mode: "active" | "history";
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  emptyMessage?: string;
}

export function GroceryList({
  household,
  items,
  loading,
  mode,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  emptyMessage,
}: GroceryListProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function togglePurchased(item: GroceryItemDTO) {
    try {
      const res = await fetch(`/api/households/${household.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchased: mode === "active" }),
      });
      if (!res.ok) toast.error("Couldn't update that item.");
    } catch {
      toast.error("Couldn't update that item.");
    }
  }

  async function removeItem(item: GroceryItemDTO) {
    const displayText = item.translations?.[profile?.preferredLanguage ?? "en"] ?? item.originalText;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(item.id);
    try {
      const res = await fetch(`/api/households/${household.id}/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that item.");
    } catch {
      toast.error("Couldn't remove that item.");
    } finally {
      deleting.stop(item.id);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <BasketIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">{emptyMessage ?? "No items yet — add the first one above."}</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const displayText = item.translations?.[myLang] ?? item.originalText;
          const showOriginal = item.originalLang !== myLang;
          const displayNote = item.note ? item.noteTranslations?.[myLang] ?? item.note : null;
          const checked = selectMode ? !!selectedIds?.has(item.id) : mode === "history";

          return (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
            >
              <Checkbox
                checked={checked}
                onChange={() => (selectMode ? onToggleSelect?.(item.id) : togglePurchased(item))}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <p className={`truncate text-sm ${checked ? "text-fg-subtle line-through" : "text-fg"}`}>
                    {displayText}
                  </p>
                  <span className="shrink-0 text-xs text-fg-subtle">
                    {item.quantity} {item.unit}
                  </span>
                  <CategoryChip category={item.category} />
                </div>
                <p className="truncate text-xs text-fg-subtle">
                  {displayNote && `${displayNote} · `}
                  {showOriginal && `"${item.originalText}" · `}
                  {mode === "history" ? "bought" : "added"} by {item.addedByName}
                </p>
              </div>
              {!selectMode && (
                <button
                  onClick={() => removeItem(item)}
                  disabled={deleting.has(item.id)}
                  aria-label="Remove item"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                >
                  {deleting.has(item.id) ? (
                    <SpinnerIcon className="size-4 animate-spin" />
                  ) : (
                    <TrashIcon className="size-4" />
                  )}
                </button>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
