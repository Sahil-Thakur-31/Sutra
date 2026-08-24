"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddTripForm } from "@/components/trips/AddTripForm";
import { TripPicker } from "@/components/trips/TripPicker";
import { PackingList } from "@/components/trips/PackingList";
import { LuggageIcon } from "@/components/ui/icons";
import type { TripDTO, PackingItemDTO } from "@/lib/types";

export default function TripsPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();
  const confirm = useConfirm();
  const deletingTrip = usePendingSet();
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [items, setItems] = useState<PackingItemDTO[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/trips`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: TripDTO[] = data.trips ?? [];
        setTrips(list);
        setTripsLoading(false);
        if (list.length > 0) setSelectedTripId((cur) => cur ?? list[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household || !selectedTripId) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/trips/${selectedTripId}/items`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setItemsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, selectedTripId]);

  function handleTripCreated(trip: TripDTO) {
    setTrips((prev) => [trip, ...prev]);
    setSelectedTripId(trip.id);
  }

  async function handleTripDelete(trip: TripDTO) {
    if (!household) return;
    const displayName = trip.translations?.[profile?.preferredLanguage ?? "en"] ?? trip.name;
    const ok = await confirm({
      title: `Delete "${displayName}"?`,
      message: "This also deletes its whole packing list.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    deletingTrip.start(trip.id);
    try {
      const res = await fetch(`/api/households/${household.id}/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete that trip.");
        return;
      }
      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== trip.id);
        if (selectedTripId === trip.id) setSelectedTripId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      toast.error("Couldn't delete that trip.");
    } finally {
      deletingTrip.stop(trip.id);
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

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const myLang = profile.preferredLanguage;

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Trip packing lists"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddTripForm household={household} onCreated={handleTripCreated} />
            <div className="border-t border-border pt-4">
              {tripsLoading ? (
                <div className="h-10 animate-shimmer rounded-xl" />
              ) : (
                <TripPicker
                  trips={trips}
                  selectedId={selectedTripId}
                  onSelect={setSelectedTripId}
                  onDelete={handleTripDelete}
                  isDeleting={deletingTrip.has}
                />
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            {selectedTrip ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <LuggageIcon className="size-5 text-accent" />
                  <h3 className="text-base font-semibold text-fg">
                    {selectedTrip.translations?.[myLang] ?? selectedTrip.name}
                  </h3>
                </div>
                <PackingList
                  household={household}
                  tripId={selectedTrip.id}
                  items={items}
                  loading={itemsLoading}
                  onItemAdded={(item) => setItems((prev) => [item, ...prev])}
                  onItemUpdated={(item) => setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))}
                  onItemRemoved={(itemId) => setItems((prev) => prev.filter((i) => i.id !== itemId))}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <LuggageIcon className="size-5" />
                </div>
                <p className="text-sm text-fg-muted">Create a trip to start a packing list.</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
