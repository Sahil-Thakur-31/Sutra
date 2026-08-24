"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validateRequired } from "@/lib/validation";
import { AuthCard } from "@/components/ui/AuthCard";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

type Mode = "create" | "join";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [result, setResult] = useState<{ inviteCode: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const householdNameField = useValidatedField(householdName, (v) => validateRequired(v, "Household name"));
  const inviteCodeField = useValidatedField(inviteCode, (v) => validateRequired(v, "Invite code"));

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace("/login");
    // Skip the auto-redirect right after creating a household -- otherwise
    // refreshProfile() picking up the new householdId immediately bounces
    // the user to the dashboard before they ever see their invite code.
    else if (profile.householdId && !result) router.replace("/");
  }, [loading, profile, router, result]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (mode === "create") {
      householdNameField.markTouched();
      if (validateRequired(householdName, "Household name")) return;
    } else {
      inviteCodeField.markTouched();
      if (validateRequired(inviteCode, "Invite code")) return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/api/household/create" : "/api/household/join";
      const body = mode === "create" ? { name: householdName } : { inviteCode };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      await refreshProfile();

      if (mode === "create") {
        setResult({ inviteCode: data.inviteCode });
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  if (result) {
    return (
      <AuthCard title="Household created!" subtitle="Share this invite code with your family so they can join.">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="rounded-2xl bg-accent-soft py-5 text-center text-3xl font-mono font-semibold tracking-[0.3em] text-accent-hover"
        >
          {result.inviteCode}
        </motion.p>
        <Button onClick={() => router.push("/")} className="mt-6 w-full">
          Go to my dashboard
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set up your household" subtitle="Start a new shared space, or join one your family already made.">
      <div className="mb-6 flex rounded-xl bg-accent-soft/50 p-1 text-sm font-medium">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="relative flex-1 rounded-lg py-1.5 transition-colors"
          >
            {mode === m && (
              <motion.span
                layoutId="household-mode-pill"
                className="absolute inset-0 rounded-lg bg-bg-elevated shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative ${mode === m ? "text-fg" : "text-fg-muted"}`}>
              {m === "create" ? "Create new" : "Join existing"}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "create" ? (
          <TextField
            label="Household name"
            type="text"
            required
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            onBlur={householdNameField.onBlur}
            error={householdNameField.error}
            placeholder="e.g. The Sharma Family"
          />
        ) : (
          <TextField
            label="Invite code"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            onBlur={inviteCodeField.onBlur}
            error={inviteCodeField.error}
            placeholder="e.g. AB12CD"
            className="font-mono uppercase tracking-widest"
          />
        )}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Please wait..." : mode === "create" ? "Create household" : "Join household"}
        </Button>
      </form>
    </AuthCard>
  );
}
