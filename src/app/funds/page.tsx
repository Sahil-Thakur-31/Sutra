"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddFundForm } from "@/components/funds/AddFundForm";
import { FundPicker } from "@/components/funds/FundPicker";
import { FundDetail } from "@/components/funds/FundDetail";
import { PiggyBankIcon } from "@/components/ui/icons";
import type { FundDTO, ContributionDTO } from "@/lib/types";

export default function FundsPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();
  const confirm = useConfirm();
  const deletingFund = usePendingSet();
  const [funds, setFunds] = useState<FundDTO[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contributions, setContributions] = useState<ContributionDTO[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/funds`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: FundDTO[] = data.funds ?? [];
        setFunds(list);
        setFundsLoading(false);
        if (list.length > 0) setSelectedId((cur) => cur ?? list[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household || !selectedId) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/funds/${selectedId}/contributions`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setContributions(data.contributions ?? []);
          setContributionsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, selectedId]);

  function handleFundCreated(fund: FundDTO) {
    setFunds((prev) => [fund, ...prev]);
    setSelectedId(fund.id);
  }

  async function handleFundDelete(fund: FundDTO) {
    if (!household) return;
    const displayName = fund.translations?.[profile?.preferredLanguage ?? "en"] ?? fund.name;
    const ok = await confirm({
      title: `Delete "${displayName}"?`,
      message: "This also deletes its contribution history.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    deletingFund.start(fund.id);
    try {
      const res = await fetch(`/api/households/${household.id}/funds/${fund.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete that goal.");
        return;
      }
      setFunds((prev) => {
        const next = prev.filter((f) => f.id !== fund.id);
        if (selectedId === fund.id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      toast.error("Couldn't delete that goal.");
    } finally {
      deletingFund.stop(fund.id);
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

  const selectedFund = funds.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Family fund"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddFundForm household={household} onCreated={handleFundCreated} />
            <div className="border-t border-border pt-4">
              {fundsLoading ? (
                <div className="h-10 animate-shimmer rounded-xl" />
              ) : (
                <FundPicker
                  funds={funds}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDelete={handleFundDelete}
                  isDeleting={deletingFund.has}
                />
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            {selectedFund ? (
              <FundDetail
                householdId={household.id}
                fund={selectedFund}
                contributions={contributions}
                loading={contributionsLoading}
                onContributed={(totalSaved, contribution) => {
                  setFunds((prev) => prev.map((f) => (f.id === selectedFund.id ? { ...f, totalSaved } : f)));
                  setContributions((prev) => [contribution, ...prev]);
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <PiggyBankIcon className="size-5" />
                </div>
                <p className="text-sm text-fg-muted">Create a savings goal to get started.</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
