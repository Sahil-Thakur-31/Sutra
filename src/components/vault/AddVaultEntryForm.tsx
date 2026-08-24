"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { VAULT_CATEGORIES } from "@/lib/vaultMeta";
import { translateForHousehold } from "@/lib/translateForHousehold";
import type { HouseholdDTO } from "@/lib/types";

const compactFieldClasses =
  "rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-2 focus:ring-accent-soft";

export function AddVaultEntryForm({ household }: { household: HouseholdDTO }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("other");
  const [sensitive, setSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();
    if (!trimmedLabel || !trimmedValue) return;

    setSubmitting(true);
    try {
      const sourceLang = profile.preferredLanguage;
      // Only the label (e.g. "Wi-Fi password") is natural language -- the
      // value itself is often a password/number that must not be mangled.
      const translations = await translateForHousehold(trimmedLabel, sourceLang, household);

      const res = await fetch(`/api/households/${household.id}/vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: trimmedLabel,
          originalLang: sourceLang,
          translations,
          value: trimmedValue,
          category,
          sensitive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't save that entry.");
        return;
      }
      setLabel("");
      setValue("");
      setSensitive(false);
    } catch {
      toast.error("Couldn't save that entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label, e.g. Wi-Fi password"
        className={compactFieldClasses}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className={compactFieldClasses}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
        className={compactFieldClasses}
      >
        {VAULT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
            {c.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="accent-accent" />
        Hide value until tapped
      </label>
      <Button type="submit" disabled={submitting || !label.trim() || !value.trim()} className="w-full">
        {submitting ? "Saving..." : "Save entry"}
      </Button>
    </form>
  );
}
