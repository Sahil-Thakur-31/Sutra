"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validateRequired, validateEmail, validatePhone, validatePassword } from "@/lib/validation";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { AuthCard } from "@/components/ui/AuthCard";
import { TextField, SelectField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [submitting, setSubmitting] = useState(false);

  const nameField = useValidatedField(name, (v) => validateRequired(v, "Name"));
  const emailField = useValidatedField(email, validateEmail);
  const phoneField = useValidatedField(phone, validatePhone);
  const passwordField = useValidatedField(password, (v) => validatePassword(v, 8));

  function allValid() {
    return !validateRequired(name, "Name") && !validateEmail(email) && !validatePhone(phone) && !validatePassword(password, 8);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    nameField.markTouched();
    emailField.markTouched();
    phoneField.markTouched();
    passwordField.markTouched();
    if (!allValid()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, preferredLanguage }),
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
      title="Create your account"
      subtitle="Set up Sutra for your family. You'll be able to sign in with either your email or phone number."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={nameField.onBlur}
          error={nameField.error}
          placeholder="Your Name"
        />

        <TextField
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={emailField.onBlur}
          error={emailField.error}
          placeholder="you@example.com"
        />

        <TextField
          label="Phone number"
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={phoneField.onBlur}
          error={phoneField.error}
          placeholder="9876543210"
        />

        <PasswordField
          label="Password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={passwordField.onBlur}
          error={passwordField.error}
          placeholder="At least 8 characters"
        />

        <SelectField
          label="Preferred language"
          value={preferredLanguage}
          onChange={(e) => setPreferredLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            // Native <option> popups render with their own (often light,
            // theme-independent) surface, so colors are pinned via the
            // theme-invariant --color-option-* tokens rather than the
            // regular (dark-mode-aware) ones -- see the dropdown contrast
            // bug this fixed.
            <option
              key={lang.code}
              value={lang.code}
              style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}
            >
              {lang.label}
            </option>
          ))}
        </SelectField>

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
