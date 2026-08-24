"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validateRequired, validatePassword, validateConfirmPassword } from "@/lib/validation";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AppHeader } from "@/components/ui/AppHeader";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useHousehold } from "@/hooks/useHousehold";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();
  const { household } = useHousehold();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [savingLanguage, setSavingLanguage] = useState(false);

  const currentField = useValidatedField(currentPassword, (v) => validateRequired(v, "Current password"));
  const newField = useValidatedField(newPassword, (v) => validatePassword(v, 8));
  const confirmField = useValidatedField(confirmPassword, (v) => validateConfirmPassword(v, newPassword));

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace("/login");
  }, [loading, profile, router]);

  useEffect(() => {
    // Seeding the select from profile once it loads, not a render loop.
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferredLanguage(profile.preferredLanguage);
    }
  }, [profile]);

  async function handleLanguageChange(next: string) {
    setPreferredLanguage(next);
    setSavingLanguage(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      await refreshProfile();
      toast.success("Language updated.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    currentField.markTouched();
    newField.markTouched();
    confirmField.markTouched();
    if (
      validateRequired(currentPassword, "Current password") ||
      validatePassword(newPassword, 8) ||
      validateConfirmPassword(confirmPassword, newPassword)
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      {household ? (
        <AppHeader
          householdName={household.name}
          inviteCode={household.inviteCode}
          backHref="/"
          pageTitle="Settings"
        />
      ) : (
        <header className="sticky top-0 z-10 border-b border-border/70 bg-bg/80 px-6 py-4 backdrop-blur-md lg:px-10">
          <span className="text-base font-semibold text-fg">Settings</span>
        </header>
      )}

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-bg-elevated p-5"
        >
          <div>
            <p className="text-sm font-medium text-fg">Appearance</p>
            <p className="text-xs text-fg-muted">Choose how Sutra looks on this device.</p>
          </div>
          <ThemeToggle />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-bg-elevated p-5"
        >
          <div>
            <p className="text-sm font-medium text-fg">Language</p>
            <p className="text-xs text-fg-muted">What you see the shared lists translated into.</p>
          </div>
          <select
            value={preferredLanguage}
            disabled={savingLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft disabled:opacity-60"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option
                key={lang.code}
                value={lang.code}
                style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}
              >
                {lang.label}
              </option>
            ))}
          </select>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onSubmit={handleChangePassword}
          className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-bg-elevated p-5"
        >
          <div>
            <p className="text-sm font-medium text-fg">Change password</p>
            <p className="text-xs text-fg-muted">Update the password you sign in with.</p>
          </div>

          <PasswordField
            label="Current password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            onBlur={currentField.onBlur}
            error={currentField.error}
          />
          <PasswordField
            label="New password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={newField.onBlur}
            error={newField.error}
            placeholder="At least 8 characters"
          />
          <PasswordField
            label="Confirm new password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={confirmField.onBlur}
            error={confirmField.error}
          />

          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Saving..." : "Change password"}
          </Button>
        </motion.form>

        <p className="mt-4 text-center text-xs text-fg-subtle">
          Looking to update your name or photo? That&apos;s on your{" "}
          <Link href="/profile" className="font-medium text-accent hover:text-accent-hover">
            profile
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
