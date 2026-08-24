"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { BILL_CATEGORIES } from "@/lib/billMeta";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

interface Member {
  uid: string;
  name: string;
}

type Mode = "expense" | "settle";

export function AddBillForm({ household }: { household: HouseholdDTO }) {
  const householdId = household.id;
  const { profile } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("expense");
  const [members, setMembers] = useState<Member[]>([]);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [paidByUid, setPaidByUid] = useState(() => profile?.uid ?? "");
  // Seeded with just the current user so submitting before the members list
  // has loaded still works (falls back to "just me"), rather than silently
  // no-op'ing on an empty split set.
  const [splitAmong, setSplitAmong] = useState<Set<string>>(() => new Set(profile ? [profile.uid] : []));

  const [toUid, setToUid] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/households/${householdId}/members`)
      .then((res) => res.json())
      .then((data) => {
        const list: Member[] = data.members ?? [];
        setMembers(list);
        setSplitAmong(new Set(list.map((m) => m.uid)));
        if (profile) {
          setPaidByUid(profile.uid);
          const otherMember = list.find((m) => m.uid !== profile.uid);
          if (otherMember) setToUid(otherMember.uid);
        }
      })
      .catch(() => setMembers([]));
  }, [householdId, profile]);

  function toggleSplit(uid: string) {
    setSplitAmong((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function handleExpenseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = description.trim();
    const amountNum = Number(amount);
    if (!trimmed) return toast.error("Enter what the expense was for.");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return toast.error("Enter a valid amount.");
    if (splitAmong.size === 0) return toast.error("Select at least one person to split with.");

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const translations = await translateForHousehold(trimmed, sourceLang, household);

      const res = await fetch(`/api/households/${householdId}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "expense",
          description: trimmed,
          originalLang: sourceLang,
          translations,
          amount: amountNum,
          category,
          paidByUid: paidByUid || profile.uid,
          splitAmong: Array.from(splitAmong),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't add that expense.");
        return;
      }
      setDescription("");
      setAmount("");
      setCategory("other");
    } catch {
      toast.error("Couldn't add that expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const amountNum = Number(settleAmount);
    if (!toUid) return toast.error("Choose who you're settling up with.");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return toast.error("Enter a valid amount.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/households/${householdId}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "settlement",
          description: "Settled up",
          originalLang: profile.preferredLanguage,
          translations: {},
          amount: amountNum,
          fromUid: profile.uid,
          toUid,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't record that settlement.");
        return;
      }
      setSettleAmount("");
    } catch {
      toast.error("Couldn't record that settlement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl bg-bg p-1 text-sm font-medium">
        {(["expense", "settle"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="relative flex-1 rounded-lg py-1.5 transition-colors"
          >
            {mode === m && (
              <motion.span
                layoutId="bill-mode-pill"
                className="absolute inset-0 rounded-lg bg-accent-soft shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative ${mode === m ? "text-accent" : "text-fg-muted"}`}>
              {m === "expense" ? "Expense" : "Settle up"}
            </span>
          </button>
        ))}
      </div>

      {mode === "expense" ? (
        <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-2.5">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it for?"
            className={compactFieldClasses}
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              aria-label="Amount"
              className={`min-w-0 flex-1 ${compactFieldClasses}`}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              className={`min-w-0 flex-1 ${compactFieldClasses}`}
            >
              {BILL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={paidByUid}
            onChange={(e) => setPaidByUid(e.target.value)}
            aria-label="Paid by"
            className={compactFieldClasses}
          >
            {members.map((m) => (
              <option key={m.uid} value={m.uid} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
                Paid by {m.uid === profile?.uid ? "you" : m.name}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-subtle">Split among</span>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <button
                  key={m.uid}
                  type="button"
                  onClick={() => toggleSplit(m.uid)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    splitAmong.has(m.uid)
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-fg-muted hover:text-fg"
                  }`}
                >
                  {m.uid === profile?.uid ? "You" : m.name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={submitting || !description.trim() || !amount} className="w-full">
            {submitting ? "Adding..." : "Add expense"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSettleSubmit} className="flex flex-col gap-2.5">
          <p className="text-xs text-fg-muted">Record a payment you made directly to another member to settle a balance.</p>
          <select value={toUid} onChange={(e) => setToUid(e.target.value)} aria-label="Pay to" className={compactFieldClasses}>
            {members
              .filter((m) => m.uid !== profile?.uid)
              .map((m) => (
                <option key={m.uid} value={m.uid} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
                  Pay {m.name}
                </option>
              ))}
          </select>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
            placeholder="Amount"
            aria-label="Settlement amount"
            className={compactFieldClasses}
          />
          <Button type="submit" disabled={submitting || !settleAmount || !toUid} className="w-full">
            {submitting ? "Recording..." : "Record settlement"}
          </Button>
        </form>
      )}
    </div>
  );
}
