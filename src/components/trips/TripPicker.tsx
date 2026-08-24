"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LuggageIcon, TrashIcon, SpinnerIcon } from "@/components/ui/icons";
import type { TripDTO } from "@/lib/types";

export function TripPicker({
  trips,
  selectedId,
  onSelect,
  onDelete,
  isDeleting,
}: {
  trips: TripDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (trip: TripDTO) => void;
  isDeleting: (id: string) => boolean;
}) {
  const { profile } = useAuth();
  const myLang = profile?.preferredLanguage ?? "en";

  if (trips.length === 0) {
    return <p className="text-xs text-fg-subtle">No trips yet — create one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {trips.map((trip) => {
        const displayName = trip.translations?.[myLang] ?? trip.name;
        const active = trip.id === selectedId;
        const deleting = isDeleting(trip.id);
        return (
          <li key={trip.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(trip.id)}
              className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                active ? "bg-accent-soft text-accent font-medium" : "text-fg-muted hover:bg-bg"
              }`}
            >
              <LuggageIcon className="size-4 shrink-0" />
              <span className="truncate">{displayName}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(trip)}
              disabled={deleting}
              aria-label="Delete trip"
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
