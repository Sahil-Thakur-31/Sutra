"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddBillForm } from "@/components/AddBillForm";
import { BillLedger, formatAmount } from "@/components/BillLedger";
import { Avatar } from "@/components/ui/Avatar";
import { MonthNav, monthKey, monthLabel } from "@/components/grocery/MonthNav";
import type { BillDTO, BalanceDTO } from "@/lib/types";

export default function BillsPage() {
  const { profile, household, loading } = useHousehold();

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [bills, setBills] = useState<BillDTO[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);

  const [balances, setBalances] = useState<BalanceDTO[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);

  function refetchBalances() {
    if (!household) return;
    fetch(`/api/households/${household.id}/bills/balances`)
      .then((res) => res.json())
      .then((data) => {
        setBalances(data.balances ?? []);
        setBalancesLoading(false);
      });
  }

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    // Resets the loading skeleton on every month change, not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBillsLoading(true);
    fetch(`/api/households/${household.id}/bills?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setBills(data.bills ?? []);
          setBillsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, month]);

  useEffect(() => {
    refetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "bill-added"; bill: BillDTO }
        | { type: "bill-removed"; billId: string }
        | { type: string };

      if (data.type === "bill-added") {
        const bill = (data as { bill: BillDTO }).bill;
        const billMonth = monthKey(new Date(bill.createdAt));
        if (billMonth === month) {
          setBills((prev) => (prev.some((b) => b.id === bill.id) ? prev : [bill, ...prev]));
        }
        refetchBalances();
      } else if (data.type === "bill-removed") {
        const billId = (data as { billId: string }).billId;
        setBills((prev) => prev.filter((b) => b.id !== billId));
        refetchBalances();
      }
    };

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household, month]);

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
        pageTitle="Bill splitting"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <MonthNav month={month} onChange={setMonth} />
            <div className="border-t border-border pt-5">
              <AddBillForm household={household} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <h3 className="mb-3 text-base font-semibold text-fg">Balances</h3>
            {balancesLoading ? (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 animate-shimmer rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {balances.map((b) => (
                  <div
                    key={b.uid}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
                  >
                    <Avatar name={b.name} className="size-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        {b.uid === profile.uid ? "You" : b.name}
                      </p>
                      <p className={`text-xs ${b.netBalance > 0 ? "text-sage" : b.netBalance < 0 ? "text-danger" : "text-fg-subtle"}`}>
                        {b.netBalance > 0
                          ? `is owed ${formatAmount(b.netBalance)}`
                          : b.netBalance < 0
                            ? `owes ${formatAmount(Math.abs(b.netBalance))}`
                            : "settled up"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">{monthLabel(month)}</h3>
              <span className="text-xs text-fg-subtle">{bills.length} entries</span>
            </div>

            <BillLedger householdId={household.id} bills={bills} loading={billsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
