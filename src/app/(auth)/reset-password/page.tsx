"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validatePassword, validateConfirmPassword } from "@/lib/validation";
import { AuthCard } from "@/components/ui/AuthCard";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordField = useValidatedField(password, (v) => validatePassword(v, 8));
  const confirmField = useValidatedField(confirmPassword, (v) => validateConfirmPassword(v, password));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    passwordField.markTouched();
    confirmField.markTouched();
    if (validatePassword(password, 8) || validateConfirmPassword(confirmPassword, password)) return;

    if (!token) {
      toast.error("This reset link is missing its token. Request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Choose a new password for your account."
      footer={
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-sage-soft px-4 py-3 text-sm text-sage"
        >
          Password updated. Taking you to sign in...
        </motion.p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordField
            label="New password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={passwordField.onBlur}
            error={passwordField.error}
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

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Saving..." : "Reset password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
