"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { useToast } from "@/contexts/ToastContext";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddMovieForm } from "@/components/AddMovieForm";
import { MovieList } from "@/components/MovieList";
import { Button } from "@/components/ui/Button";
import { DiceIcon } from "@/components/ui/icons";
import type { MovieDTO } from "@/lib/types";

type Tab = "active" | "watched";

export default function MoviesPage() {
  const { profile, household, loading } = useHousehold();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("active");
  const [movies, setMovies] = useState<MovieDTO[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const [watched, setWatched] = useState<MovieDTO[]>([]);
  const [watchedLoading, setWatchedLoading] = useState(true);

  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/movies`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setMovies(data.movies ?? []);
          setMoviesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household]);

  useEffect(() => {
    if (!household || tab !== "watched") return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/movies?status=watched`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setWatched(data.movies ?? []);
          setWatchedLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [household, tab]);

  useEffect(() => {
    if (!household) return;

    const source = new EventSource(`/api/households/${household.id}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as
        | { type: "movie-added"; movie: MovieDTO }
        | { type: "movie-updated"; movie: MovieDTO }
        | { type: "movie-removed"; movieId: string }
        | { type: string };

      if (data.type === "movie-added") {
        const movie = (data as { movie: MovieDTO }).movie;
        setMovies((prev) => (prev.some((m) => m.id === movie.id) ? prev : [...prev, movie]));
      } else if (data.type === "movie-updated") {
        const movie = (data as { movie: MovieDTO }).movie;
        if (movie.watched) {
          setMovies((prev) => prev.filter((m) => m.id !== movie.id));
          setWatched((prev) => (prev.some((m) => m.id === movie.id) ? prev.map((m) => (m.id === movie.id ? movie : m)) : [movie, ...prev]));
        } else {
          setMovies((prev) => prev.map((m) => (m.id === movie.id ? movie : m)));
        }
      } else if (data.type === "movie-removed") {
        const movieId = (data as { movieId: string }).movieId;
        setMovies((prev) => prev.filter((m) => m.id !== movieId));
        setWatched((prev) => prev.filter((m) => m.id !== movieId));
      }
    };

    return () => source.close();
  }, [household]);

  async function handlePick() {
    if (!household) return;
    setPicking(true);
    try {
      const res = await fetch(`/api/households/${household.id}/movies/pick`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't pick a movie.");
        return;
      }
      const title = data.movie.translations?.[profile?.preferredLanguage ?? "en"] ?? data.movie.title;
      toast.success(`🎬 Tonight's pick: ${title}`);
    } catch {
      toast.error("Couldn't pick a movie. Please try again.");
    } finally {
      setPicking(false);
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

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Movie night"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <div className="flex rounded-xl bg-bg p-1 text-sm font-medium">
              {(["active", "watched"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="relative flex-1 rounded-lg py-1.5 transition-colors"
                >
                  {tab === t && (
                    <motion.span
                      layoutId="movies-tab-pill"
                      className="absolute inset-0 rounded-lg bg-accent-soft shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-accent" : "text-fg-muted"}`}>
                    {t === "active" ? "Suggestions" : "Watched"}
                  </span>
                </button>
              ))}
            </div>

            {tab === "active" && (
              <>
                <AddMovieForm householdId={household.id} />
                <div className="border-t border-border pt-5">
                  <Button onClick={handlePick} disabled={picking || movies.length === 0} className="w-full">
                    <DiceIcon className="size-4" />
                    {picking ? "Picking..." : "Pick tonight's movie"}
                  </Button>
                  <p className="mt-2 text-center text-xs text-fg-subtle">
                    Random, weighted by votes — everyone&apos;s suggestion has a chance.
                  </p>
                </div>
              </>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">{tab === "active" ? "Suggestions" : "Watched"}</h3>
              <span className="text-xs text-fg-subtle">
                {tab === "active" ? `${movies.length} suggested` : `${watched.length} watched`}
              </span>
            </div>

            {tab === "active" ? (
              <MovieList
                householdId={household.id}
                movies={movies}
                loading={moviesLoading}
                emptyMessage="No suggestions yet — add one to get movie night started."
              />
            ) : (
              <MovieList
                householdId={household.id}
                movies={watched}
                loading={watchedLoading}
                emptyMessage="Nothing watched yet."
                showWatchedBadge
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
