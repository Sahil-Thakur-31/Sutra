import type { HouseholdDTO } from "@/lib/types";

/**
 * Translates `text` into every language spoken in the household (besides
 * `sourceLang`), so every member sees it naturally in their own language --
 * the app's core premise. Falls back to echoing the original if translation
 * fails, so adding content never blocks on the Gemini call.
 */
export async function translateForHousehold(
  text: string,
  sourceLang: string,
  household: HouseholdDTO
): Promise<Record<string, string>> {
  const targetLangs = Array.from(new Set(Object.values(household.memberLanguages)));
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceLang, targetLangs }),
    });
    const data = await res.json();
    return res.ok ? data.translations : { [sourceLang]: text };
  } catch {
    return { [sourceLang]: text };
  }
}
