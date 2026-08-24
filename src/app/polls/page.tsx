"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddPollForm } from "@/components/polls/AddPollForm";
import { PollList } from "@/components/polls/PollList";
import type { PollDTO } from "@/lib/types";

export default function PollsPage() {
  const { profile, household, loading } = useHousehold();
  const [polls, setPolls] = useState<PollDTO[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/polls`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPolls(data.polls ?? []);
          setPollsLoading(false);
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
        | { type: "poll-added"; poll: PollDTO }
        | { type: "poll-updated"; poll: PollDTO }
        | { type: "poll-removed"; pollId: string }
        | { type: string };

      if (data.type === "poll-added") {
        const poll = (data as { poll: PollDTO }).poll;
        setPolls((prev) => (prev.some((p) => p.id === poll.id) ? prev : [poll, ...prev]));
      } else if (data.type === "poll-updated") {
        const poll = (data as { poll: PollDTO }).poll;
        setPolls((prev) => prev.map((p) => (p.id === poll.id ? poll : p)));
      } else if (data.type === "poll-removed") {
        const pollId = (data as { pollId: string }).pollId;
        setPolls((prev) => prev.filter((p) => p.id !== pollId));
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
        pageTitle="Quick polls"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddPollForm household={household} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">Family polls</h3>
              <span className="text-xs text-fg-subtle">{polls.length} open</span>
            </div>

            <PollList householdId={household.id} polls={polls} loading={pollsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
