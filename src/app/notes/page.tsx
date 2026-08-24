"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NoteBoard } from "@/components/notes/NoteBoard";
import type { NoteDTO } from "@/lib/types";

function sortNotes(list: NoteDTO[]): NoteDTO[] {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
}

export default function NotesPage() {
  const { profile, household, loading } = useHousehold();
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetch(`/api/households/${household.id}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setNotes(data.notes ?? []);
          setNotesLoading(false);
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
        | { type: "note-added"; note: NoteDTO }
        | { type: "note-updated"; note: NoteDTO }
        | { type: "note-removed"; noteId: string }
        | { type: string };

      if (data.type === "note-added") {
        const note = (data as { note: NoteDTO }).note;
        setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : sortNotes([note, ...prev])));
      } else if (data.type === "note-updated") {
        const note = (data as { note: NoteDTO }).note;
        setNotes((prev) => sortNotes(prev.map((n) => (n.id === note.id ? note : n))));
      } else if (data.type === "note-removed") {
        const noteId = (data as { noteId: string }).noteId;
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
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
        pageTitle="Notice board"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5 rounded-3xl border border-border bg-bg-elevated p-5 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_16px_32px_-16px_rgb(var(--shadow-color)/0.2)] lg:sticky lg:top-24"
          >
            <AddNoteForm household={household} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-fg">Family notice board</h3>
              <span className="text-xs text-fg-subtle">{notes.length} pinned</span>
            </div>

            <NoteBoard householdId={household.id} notes={notes} loading={notesLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
