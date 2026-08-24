"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useHousehold } from "@/hooks/useHousehold";
import { useValidatedField } from "@/hooks/useValidatedField";
import { validateRequired, validateEmail, validatePhone } from "@/lib/validation";
import { resizeImageToDataUrl } from "@/lib/image";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { AppHeader } from "@/components/ui/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { CameraIcon } from "@/components/ui/icons";

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { household, loading } = useHousehold();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Seeding the form from profile once it loads, not a render loop.
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(profile.name);
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
      setDateOfBirth(profile.dateOfBirth ?? "");
      setGender(profile.gender ?? "");
    }
  }, [profile]);

  const nameField = useValidatedField(name, (v) => validateRequired(v, "Name"));
  const emailField = useValidatedField(email, validateEmail);
  const phoneField = useValidatedField(phone, validatePhone);

  const credentialsChanged = !!profile && (email !== (profile.email ?? "") || phone !== (profile.phone ?? ""));
  const passwordField = useValidatedField(currentPassword, (v) =>
    credentialsChanged ? validateRequired(v, "Current password") : undefined
  );

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingPhoto(true);
    try {
      setNewPhotoDataUrl(await resizeImageToDataUrl(file));
    } catch {
      toast.error("Couldn't read that image.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    nameField.markTouched();
    emailField.markTouched();
    phoneField.markTouched();
    passwordField.markTouched();

    if (
      validateRequired(name, "Name") ||
      validateEmail(email) ||
      validatePhone(phone) ||
      (credentialsChanged && validateRequired(currentPassword, "Current password"))
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const meBody: Record<string, string> = { name, dateOfBirth: dateOfBirth || "", gender: gender || "" };
      if (newPhotoDataUrl) meBody.photoUrl = newPhotoDataUrl;

      const meRes = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meBody),
      });
      const meData = await meRes.json();
      if (!meRes.ok) {
        toast.error(meData.error ?? "Something went wrong.");
        return;
      }

      if (profile && email !== (profile.email ?? "")) {
        const res = await fetch("/api/auth/email", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: email, currentPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Couldn't update your email.");
          return;
        }
      }

      if (profile && phone !== (profile.phone ?? "")) {
        const res = await fetch("/api/auth/phone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPhone: phone, currentPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Couldn't update your phone number.");
          return;
        }
      }

      await refreshProfile();
      toast.success("Profile updated.");
      router.push("/profile");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
        backHref="/profile"
        pageTitle="Edit profile"
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-6 lg:px-10">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-elevated p-6"
        >
          <div className="flex items-center gap-5">
            <div className="group relative shrink-0">
              <Avatar name={name || profile.name} photoUrl={newPhotoDataUrl ?? profile.photoUrl} className="size-20 text-2xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label="Change photo"
                className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-bg-elevated bg-accent text-accent-fg shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
              >
                <CameraIcon className="size-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />
            </div>
            <p className="text-sm text-fg-muted">Tap the camera to change your photo.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label="Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={nameField.onBlur}
                error={nameField.error}
              />
            </div>

            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={emailField.onBlur}
              error={emailField.error}
            />
            <TextField
              label="Phone number"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={phoneField.onBlur}
              error={phoneField.error}
            />

            <TextField
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg/80">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-fg outline-none transition-shadow focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
              >
                <option value="" style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
                  Prefer not to say
                </option>
                {GENDERS.map((g) => (
                  <option key={g} value={g} style={{ color: "var(--color-option-fg)", backgroundColor: "var(--color-option-bg)" }}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {credentialsChanged && (
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onBlur={passwordField.onBlur}
              error={passwordField.error}
            />
          )}
          {credentialsChanged && (
            <p className="-mt-3 text-xs text-fg-subtle">Changing your email or phone number needs your password to confirm it&apos;s you.</p>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting || uploadingPhoto}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/profile")}>
              Cancel
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}
