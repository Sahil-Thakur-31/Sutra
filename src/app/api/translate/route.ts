import { NextResponse, type NextRequest } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getUidFromRequest } from "@/lib/auth/session";
import { languageLabel } from "@/lib/languages";

interface TranslateBody {
  text: string;
  sourceLang: string;
  targetLangs: string[];
}

export async function POST(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: TranslateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = body.text?.trim();
  const sourceLang = body.sourceLang;
  const targetLangs = Array.from(new Set(body.targetLangs ?? [])).filter((l) => l !== sourceLang);

  if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });

  // Nothing to translate into — just echo the original back under its own language.
  if (targetLangs.length === 0) {
    return NextResponse.json({ translations: { [sourceLang]: text } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Translation is not configured on the server." }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const properties: Record<string, { type: Type; description: string }> = {};
  for (const lang of targetLangs) {
    properties[lang] = {
      type: Type.STRING,
      description: `Natural, contextual translation into ${languageLabel(lang)}`,
    };
  }

  const prompt = `You are translating a single entry from a shared family household grocery/to-do list, written in ${languageLabel(
    sourceLang
  )}.

Entry: "${text}"

Translate it naturally and contextually into each requested language, the way a native speaker would phrase it on their own grocery/to-do list — not a literal word-for-word translation. Preserve quantities, units, and brand names as-is. Keep each translation short, like the original.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties,
          required: targetLangs,
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as Record<string, string>;
    const translations: Record<string, string> = { [sourceLang]: text };
    for (const lang of targetLangs) {
      translations[lang] = parsed[lang]?.trim() || text;
    }

    return NextResponse.json({ translations });
  } catch (err) {
    console.error("Translation failed:", err);
    // Degrade gracefully: fall back to the original text for every language
    // rather than blocking the user from adding their item.
    const translations: Record<string, string> = { [sourceLang]: text };
    for (const lang of targetLangs) translations[lang] = text;
    return NextResponse.json({ translations });
  }
}
