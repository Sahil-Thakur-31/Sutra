import { normalizePhone } from "@/lib/auth/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string, fieldName = "This field"): string | undefined {
  if (!value.trim()) return `${fieldName} is required.`;
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "Phone number is required.";
  if (!normalizePhone(value.trim())) return "Enter a valid phone number, e.g. 9876543210.";
  return undefined;
}

export function validatePassword(value: string, minLength = 8): string | undefined {
  if (!value) return "Password is required.";
  if (value.length < minLength) return `Password must be at least ${minLength} characters.`;
  return undefined;
}

export function validateConfirmPassword(value: string, original: string): string | undefined {
  if (!value) return "Please confirm your password.";
  if (value !== original) return "Passwords don't match.";
  return undefined;
}
