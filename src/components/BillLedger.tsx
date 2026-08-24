"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, WalletIcon, ArrowRightIcon, SpinnerIcon } from "@/components/ui/icons";
import { billCategoryLabel, billCategoryColorVar } from "@/lib/billMeta";
import type { BillDTO } from "@/lib/types";

export function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function BillLedger({
  householdId,
  bills,
  loading,
}: {
  householdId: string;
  bills: BillDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function removeBill(bill: BillDTO) {
    const ok = await confirm({
      title: `Delete this ${formatAmount(bill.amount)} entry?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    deleting.start(bill.id);
    try {
      const res = await fetch(`/api/households/${householdId}/bills/${bill.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that entry.");
    } catch {
      toast.error("Couldn't remove that entry.");
    } finally {
      deleting.stop(bill.id);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <WalletIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">No expenses logged this month yet.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {bills.map((bill) => {
          const isSettlement = bill.kind === "settlement";
          const displayText = isSettlement
            ? undefined
            : bill.translations?.[myLang] ?? bill.description;

          return (
            <motion.li
              key={bill.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                {isSettlement ? (
                  <p className="flex items-center gap-1.5 truncate text-sm text-fg">
                    {bill.fromName} <ArrowRightIcon className="size-3.5 text-fg-subtle" /> {bill.toName}
                    <span className="text-fg-subtle">· settled</span>
                  </p>
                ) : (
                  <>
                    <p className="truncate text-sm text-fg">{displayText}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          color: `var(--color-${billCategoryColorVar(bill.category)})`,
                          backgroundColor: `var(--color-${billCategoryColorVar(bill.category)}-soft)`,
                        }}
                      >
                        {billCategoryLabel(bill.category)}
                      </span>
                      <span className="text-xs text-fg-subtle">
                        paid by {bill.paidByUid === profile?.uid ? "you" : bill.paidByName} · split {bill.splitAmong?.length ?? 0}{" "}
                        ways
                      </span>
                    </div>
                  </>
                )}
              </div>
              <span className={`shrink-0 text-sm font-semibold ${isSettlement ? "text-fg-muted" : "text-fg"}`}>
                {formatAmount(bill.amount)}
              </span>
              <button
                onClick={() => removeBill(bill)}
                disabled={deleting.has(bill.id)}
                aria-label="Remove entry"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(bill.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
