/**
 * Normalizes a phone number to E.164. Bare 10-digit numbers are assumed to
 * be Indian mobile numbers (+91) since that's this app's primary audience;
 * anything else must already include a country code.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s-()]/g, "");

  if (/^\+[1-9][0-9]{6,14}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[6-9][0-9]{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  return null;
}
