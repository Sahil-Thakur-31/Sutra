"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { FundDTO, HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddFundForm({ household, onCreated }: { household: HouseholdDTO; onCreated: (fund: FundDTO) => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = name.trim();
    const target = Number(targetAmount);
    if (!trimmed || !target || target <= 0) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          originalLang: sourceLang,
          translations,
          targetAmount: target,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't create that fund.");
        return;
      }
      onCreated(data.fund);
      setName("");
      setTargetAmount("");
    } catch {
      toast.error("Couldn't create that fund. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Goal, e.g. Goa Trip Fund"
        className={compactFieldClasses}
      />
      <input
        type="number"
        min={1}
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
        placeholder="Target amount (₹)"
        className={compactFieldClasses}
      />
      <Button type="submit" disabled={submitting || !name.trim() || !targetAmount} className="w-full">
        {submitting ? "Creating..." : "New goal"}
      </Button>
    </form>
  );
}
