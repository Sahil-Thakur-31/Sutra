"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddItemForm } from "@/components/AddItemForm";
import { GroceryList } from "@/components/GroceryList";
import { GroceryToolbar, type SortOption } from "@/components/grocery/GroceryToolbar";
import { MonthNav, monthKey, monthLabel } from "@/components/grocery/MonthNav";
import type { GroceryItemDTO } from "@/lib/types";

type Tab = "active" | "history";

function filterAndSort(
  items: GroceryItemDTO[],
  search: string,
  categories: Set<string>,
  sortBy: SortOption
): GroceryItemDTO[] {
  let result = items;

  if (categories.size > 0) result = result.filter((i) => categories.has(i.category));

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (i) =>
        i.originalText.toLowerCase().includes(q) ||
        Object.values(i.translations).some((t) => t.toLowerCase().includes(q)) ||
        i.note?.toLowerCase().includes(q)
    );
  }

  if (sortBy === "category") {
    result = [...result].sort((a, b) => a.category.localeCompare(b.category) || b.createdAt - a.createdAt);
  } else if (sortBy === "addedBy") {
    result = [...result].sort((a, b) => a.addedByName.localeCompare(b.addedByName) || b.createdAt - a.createdAt);
  }

  return result;
}

export default function GroceryPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("active");
  const [activeItems, setActiveItems] = useState<GroceryItemDTO[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);

  const [historyMonth, setHistoryMonth] = useState(() => monthKey(new Date()));
  const [historyItems, setHistoryItems] = useState<GroceryItemDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const resetToolbar = useCallback(() => {
    setSearch("");
    setActiveCategories(new Set());
    setSortBy("newest");
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    resetToolbar();
  }

  function toggleCategory(value: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Active list: fetched once, then kept live via SSE (real-time collaboration
  // matters while everyone's actively shopping).
  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/items?status=active`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setActiveItems(data.items ?? []);
          setActiveLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "item-added"; item: GroceryItemDTO }
        | { type: "item-updated"; item: GroceryItemDTO }
        | { type: "item-removed"; itemId: string };

      setActiveItems((prev) => {
        if (data.type === "item-added") {
          if (data.item.purchasedAt !== null) return prev;
          if (prev.some((i) => i.id === data.item.id)) return prev;
          return [data.item, ...prev];
        }
        if (data.type === "item-updated") {
          // Purchased -> leaves the active list. Otherwise just update in place.
          if (data.item.purchasedAt !== null) return prev.filter((i) => i.id !== data.item.id);
          if (!prev.some((i) => i.id === data.item.id)) return [data.item, ...prev];
          return prev.map((i) => (i.id === data.item.id ? data.item : i));
        }
        return prev.filter((i) => i.id !== data.itemId);
      });
    };

    return () => source.close();
  }, [household]);

  // History: fetched on demand for whichever month is selected. The
  // synchronous setHistoryLoading(true) below is deliberate -- tab/month
  // genuinely change repeatedly during a session, and each change should
  // show the loading skeleton again while the new month's data comes in.
  useEffect(() => {
    if (!household || tab !== "history") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryLoading(true);
    fetch(`/api/households/${household.id}/items?status=purchased&month=${historyMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setHistoryItems(data.items ?? []);
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, tab, historyMonth]);

  async function handleBulkDelete() {
    if (!household || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(`/api/households/${household.id}/items/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        toast.error("Couldn't delete the selected items.");
        return;
      }
      if (tab === "history") {
        setHistoryItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      }
      // Active tab updates via SSE automatically.
      toast.success(`Deleted ${ids.length} item${ids.length === 1 ? "" : "s"}.`);
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      toast.error("Couldn't delete the selected items.");
    }
  }

  const visibleRawItems = tab === "active" ? activeItems : historyItems;
  const visibleItems = useMemo(
    () => filterAndSort(visibleRawItems, search, activeCategories, sortBy),
    [visibleRawItems, search, activeCategories, sortBy]
  );

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Grocery list"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <div className="flex rounded-xl bg-bg p-1 text-sm font-medium">
              {(["active", "history"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className="relative flex-1 rounded-lg py-1.5 transition-colors"
                >
                  {tab === t && (
                    <motion.span
                      layoutId="grocery-tab-pill"
                      className="absolute inset-0 rounded-lg bg-accent-soft shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-accent" : "text-fg-muted"}`}>
                    {t === "active" ? "Shopping list" : "History"}
                  </span>
                </button>
              ))}
            </div>

            {tab === "active" ? <AddItemForm household={household} /> : <MonthNav month={historyMonth} onChange={setHistoryMonth} />}

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <GroceryToolbar
                search={search}
                onSearchChange={setSearch}
                activeCategories={activeCategories}
                onToggleCategory={toggleCategory}
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectMode={selectMode}
                onToggleSelectMode={() => {
                  setSelectMode((v) => !v);
                  setSelectedIds(new Set());
                }}
                selectedCount={selectedIds.size}
                onBulkDelete={handleBulkDelete}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">
                {tab === "active" ? "Shopping list" : `Bought in ${monthLabel(historyMonth)}`}
              </h3>
              <span className="text-xs text-fg-subtle">
                {tab === "active"
                  ? `${visibleItems.length} item${visibleItems.length === 1 ? "" : "s"} to get`
                  : `${visibleItems.length} bought`}
              </span>
            </div>

            <GroceryList
              household={household}
              items={visibleItems}
              loading={tab === "active" ? activeLoading : historyLoading}
              mode={tab}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              emptyMessage={tab === "active" ? "No items yet — add the first one above." : "Nothing bought yet this month."}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
