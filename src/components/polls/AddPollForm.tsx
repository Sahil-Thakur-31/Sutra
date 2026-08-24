"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { translateForHousehold } from "@/lib/translateForHousehold";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import type { HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddPollForm({ household, onAdded }: { household: HouseholdDTO; onAdded?: () => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion || trimmedOptions.length < 2) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      const questionT = await translateForHousehold(trimmedQuestion, sourceLang, household);
      const optionsT = await Promise.all(
        trimmedOptions.map(async (text) => ({
          text,
          translations: await translateForHousehold(text, sourceLang, household),
        }))
      );

      const res = await fetch(`/api/households/${household.id}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          originalLang: sourceLang,
          translations: questionT,
          options: optionsT,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't create that poll.");
        return;
      }
      setQuestion("");
      setOptions(["", ""]);
      onAdded?.();
    } catch {
      toast.error("Couldn't create that poll. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What's the question?"
        className={compactFieldClasses}
      />
      {options.map((opt, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className={`min-w-0 flex-1 ${compactFieldClasses}`}
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => removeOption(i)}
              aria-label="Remove option"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setOptions((prev) => [...prev, ""])}
        className="self-start text-xs font-medium text-accent hover:text-accent-hover"
      >
        + Add option
      </button>
      <Button type="submit" disabled={submitting || !canSubmit} className="w-full">
        {submitting ? "Creating..." : "Create poll"}
      </Button>
    </form>
  );
}
