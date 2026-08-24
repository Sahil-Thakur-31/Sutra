"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { TrashIcon, FilmIcon, HeartIcon, DiceIcon, SpinnerIcon } from "@/components/ui/icons";
import type { MovieDTO } from "@/lib/types";

interface MovieListProps {
  householdId: string;
  movies: MovieDTO[];
  loading: boolean;
  emptyMessage?: string;
  showWatchedBadge?: boolean;
}

export function MovieList({ householdId, movies, loading, emptyMessage, showWatchedBadge }: MovieListProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function toggleVote(movie: MovieDTO) {
    if (!profile) return;
    const hasVoted = movie.votes.includes(profile.uid);
    try {
      const res = await fetch(`/api/households/${householdId}/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: !hasVoted }),
      });
      if (!res.ok) toast.error("Couldn't update your vote.");
    } catch {
      toast.error("Couldn't update your vote.");
    }
  }

  async function removeMovie(movie: MovieDTO) {
    const displayText = movie.translations?.[profile?.preferredLanguage ?? "en"] ?? movie.title;
    const ok = await confirm({ title: `Remove "${displayText}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(movie.id);
    try {
      const res = await fetch(`/api/households/${householdId}/movies/${movie.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that movie.");
    } catch {
      toast.error("Couldn't remove that movie.");
    } finally {
      deleting.stop(movie.id);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <FilmIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">{emptyMessage ?? "No suggestions yet — add one."}</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";
  const sorted = [...movies].sort((a, b) => b.votes.length - a.votes.length);

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {sorted.map((movie) => {
          const displayText = movie.translations?.[myLang] ?? movie.title;
          const voted = profile ? movie.votes.includes(profile.uid) : false;

          return (
            <motion.li
              key={movie.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{displayText}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
                  added by {movie.addedByName}
                  {showWatchedBadge && movie.pickedRandomly && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      <DiceIcon className="size-2.5" /> Picked
                    </span>
                  )}
                </p>
              </div>
              {!showWatchedBadge && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleVote(movie)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    voted ? "border-cat-rose bg-cat-rose-soft text-cat-rose" : "border-border text-fg-muted hover:text-fg"
                  }`}
                >
                  <HeartIcon className="size-3.5" fill={voted ? "currentColor" : "none"} />
                  {movie.votes.length}
                </motion.button>
              )}
              <button
                onClick={() => removeMovie(movie)}
                disabled={deleting.has(movie.id)}
                aria-label="Remove movie"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting.has(movie.id) ? <SpinnerIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
