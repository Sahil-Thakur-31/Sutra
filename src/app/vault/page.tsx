"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddVaultEntryForm } from "@/components/vault/AddVaultEntryForm";
import { VaultList } from "@/components/vault/VaultList";
import type { VaultEntryDTO } from "@/lib/types";

export default function VaultPage() {
  const { profile, household, loading } = useHousehold();
  const [entries, setEntries] = useState<VaultEntryDTO[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/vault`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setEntries(data.entries ?? []);
          setEntriesLoading(false);
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
        | { type: "vault-added"; entry: VaultEntryDTO }
        | { type: "vault-removed"; entryId: string }
        | { type: string };

      if (data.type === "vault-added") {
        const entry = (data as { entry: VaultEntryDTO }).entry;
        setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev]));
      } else if (data.type === "vault-removed") {
        const entryId = (data as { entryId: string }).entryId;
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    };
    return () => source.close();
  }, [household]);

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
        pageTitle="Important info"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddVaultEntryForm household={household} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">Contacts, Wi-Fi &amp; documents</h3>
              <span className="text-xs text-fg-subtle">{entries.length} saved</span>
            </div>

            <VaultList householdId={household.id} entries={entries} loading={entriesLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
