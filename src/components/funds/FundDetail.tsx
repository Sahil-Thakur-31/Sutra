"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { FundDTO, ContributionDTO } from "@/lib/types";

interface FundDetailProps {
  householdId: string;
  fund: FundDTO;
  contributions: ContributionDTO[];
  loading: boolean;
  onContributed: (totalSaved: number, contribution: ContributionDTO) => void;
}

export function FundDetail({ householdId, fund, contributions, loading, onContributed }: FundDetailProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myLang = profile?.preferredLanguage ?? "en";
  const displayName = fund.translations?.[myLang] ?? fund.name;
  const pct = Math.min(100, Math.round((fund.totalSaved / fund.targetAmount) * 100));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/households/${householdId}/funds/${fund.id}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add that contribution.");
        return;
      }
      onContributed(data.totalSaved, data.contribution);
      setAmount("");
      setNote("");
      toast.success("Contribution added!");
    } catch {
      toast.error("Couldn't add that contribution. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-bg-elevated p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-fg">{displayName}</h3>
          <span className="text-sm text-fg-muted">
            {fund.currency}
            {fund.totalSaved.toLocaleString()} / {fund.currency}
            {fund.targetAmount.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-bg">
          <motion.div
            className="h-full rounded-full bg-sage"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">{pct}% of the goal</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Amount (${fund.currency})`}
          className="min-w-[120px] flex-1 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="min-w-[120px] flex-1 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
        />
        <Button type="submit" disabled={submitting || !amount}>
          {submitting ? "Adding..." : "Contribute"}
        </Button>
      </form>

      {loading ? (
        <div className="h-24 animate-shimmer rounded-2xl" />
      ) : contributions.length === 0 ? (
        <p className="text-sm text-fg-muted">No contributions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contributions.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5">
              <Avatar name={c.contributedByName} className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-fg">
                  {fund.currency}
                  {c.amount.toLocaleString()} by {c.contributedByName}
                </p>
                <p className="truncate text-xs text-fg-subtle">
                  {c.note && `${c.note} · `}
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
