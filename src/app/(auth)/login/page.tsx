"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validateRequired } from "@/lib/validation";
import { AuthCard } from "@/components/ui/AuthCard";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const identifierField = useValidatedField(identifier, (v) => validateRequired(v, "Email or phone"));
  const passwordField = useValidatedField(password, (v) => validateRequired(v, "Password"));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    identifierField.markTouched();
    passwordField.markTouched();
    if (validateRequired(identifier) || validateRequired(password)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      await refreshProfile();
      router.push("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your family's Sutra."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:text-accent-hover">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Email or phone number"
          type="text"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onBlur={identifierField.onBlur}
          error={identifierField.error}
          placeholder="you@example.com or 9876543210"
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={passwordField.onBlur}
            error={passwordField.error}
          />
          <Link href="/forgot-password" className="self-end text-xs font-medium text-accent hover:text-accent-hover">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
