"use client";

import { useAuth } from "@/contexts/AuthContext";
import { PiggyBankIcon, TrashIcon, SpinnerIcon } from "@/components/ui/icons";
import type { FundDTO } from "@/lib/types";

export function FundPicker({
  funds,
  selectedId,
  onSelect,
  onDelete,
  isDeleting,
}: {
  funds: FundDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (fund: FundDTO) => void;
  isDeleting: (id: string) => boolean;
}) {
  const { profile } = useAuth();
  const myLang = profile?.preferredLanguage ?? "en";

  if (funds.length === 0) {
    return <p className="text-xs text-fg-subtle">No savings goals yet — create one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {funds.map((fund) => {
        const displayName = fund.translations?.[myLang] ?? fund.name;
        const active = fund.id === selectedId;
        const pct = Math.min(100, Math.round((fund.totalSaved / fund.targetAmount) * 100));
        const deleting = isDeleting(fund.id);
        return (
          <li key={fund.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(fund.id)}
              className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                active ? "bg-accent-soft text-accent font-medium" : "text-fg-muted hover:bg-bg"
              }`}
            >
              <PiggyBankIcon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
              <span className="shrink-0 text-xs opacity-70">{pct}%</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(fund)}
              disabled={deleting}
              aria-label="Delete goal"
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
