"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, CheckIcon, SpinnerIcon } from "@/components/ui/icons";
import type { PollDTO } from "@/lib/types";

export function PollList({
  householdId,
  polls,
  loading,
}: {
  householdId: string;
  polls: PollDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function vote(poll: PollDTO, optionId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: optionId }),
      });
      if (!res.ok) toast.error("Couldn't record your vote.");
    } catch {
      toast.error("Couldn't record your vote.");
    }
  }

  async function toggleClosed(poll: PollDTO) {
    try {
      const res = await fetch(`/api/households/${householdId}/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed: !poll.closed }),
      });
      if (!res.ok) toast.error("Couldn't update that poll.");
    } catch {
      toast.error("Couldn't update that poll.");
    }
  }

  async function removePoll(poll: PollDTO) {
    const displayQuestion = poll.translations?.[profile?.preferredLanguage ?? "en"] ?? poll.question;
    const ok = await confirm({ title: `Delete "${displayQuestion}"?`, confirmLabel: "Delete" });
    if (!ok) return;

    deleting.start(poll.id);
    try {
      const res = await fetch(`/api/households/${householdId}/polls/${poll.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't delete that poll.");
    } catch {
      toast.error("Couldn't delete that poll.");
    } finally {
      deleting.stop(poll.id);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-fg-muted">No polls yet — create one to decide something together.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";

  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {polls.map((poll) => {
          const displayQuestion = poll.translations?.[myLang] ?? poll.question;
          const totalVotes = poll.options.reduce((sum, o) => sum + o.voterUids.length, 0);
          const myVote = poll.options.find((o) => profile && o.voterUids.includes(profile.uid))?.id;
          const isCreator = poll.createdByUid === profile?.uid;

          return (
            <motion.li
              key={poll.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="rounded-2xl border border-border bg-bg-elevated p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-fg">{displayQuestion}</p>
                <div className="flex shrink-0 items-center gap-1">
                  {poll.closed && (
                    <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-fg-subtle">Closed</span>
                  )}
                  {isCreator && (
                    <button
                      onClick={() => toggleClosed(poll)}
                      className="text-[11px] font-medium text-accent hover:text-accent-hover"
                    >
                      {poll.closed ? "Reopen" : "Close"}
                    </button>
                  )}
                  <button
                    onClick={() => removePoll(poll)}
                    disabled={deleting.has(poll.id)}
                    aria-label="Delete poll"
                    className="flex size-7 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                  >
                    {deleting.has(poll.id) ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {poll.options.map((option) => {
                  const displayText = option.translations?.[myLang] ?? option.text;
                  const pct = totalVotes === 0 ? 0 : Math.round((option.voterUids.length / totalVotes) * 100);
                  const isMine = myVote === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={poll.closed}
                      onClick={() => vote(poll, option.id)}
                      className={`relative overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                        isMine ? "border-accent" : "border-border hover:border-accent/40"
                      }`}
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-accent-soft transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-fg">
                          {isMine && <CheckIcon className="size-3.5 text-accent" />}
                          {displayText}
                        </span>
                        <span className="text-xs text-fg-subtle">
                          {option.voterUids.length} · {pct}%
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-fg-subtle">by {poll.createdByName}</p>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
