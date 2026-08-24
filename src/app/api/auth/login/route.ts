import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { verifyPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/phone";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import type { UserProfileDTO } from "@/lib/types";

interface LoginBody {
  identifier: string;
  password: string;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { identifier, password } = body;
  const genericError = () => NextResponse.json({ error: "Incorrect credentials." }, { status: 401 });

  const raw = identifier?.trim();
  if (!raw || !password) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  // Accept either an email or a phone number in the same field, detected by shape.
  let query: { email: string } | { phone: string };
  if (raw.includes("@")) {
    query = { email: raw.toLowerCase() };
  } else {
    const normalized = normalizePhone(raw);
    if (!normalized) return genericError();
    query = { phone: normalized };
  }

  const db = await getDb();
  const userDoc = await db.collection("users").findOne(query);
  if (!userDoc) return genericError();

  const passwordOk = await verifyPassword(password, userDoc.passwordHash);
  if (!passwordOk) return genericError();

  const uid = userDoc._id.toHexString();
  const profile: UserProfileDTO = {
    uid,
    name: userDoc.name,
    email: userDoc.email ?? null,
    phone: userDoc.phone ?? null,
    preferredLanguage: userDoc.preferredLanguage,
    householdId: userDoc.householdId ?? null,
    photoUrl: userDoc.photoUrl ?? null,
    dateOfBirth: userDoc.dateOfBirth ?? null,
    gender: userDoc.gender ?? null,
  };

  const response = NextResponse.json({ profile });
  response.cookies.set(SESSION_COOKIE, signSession(uid), sessionCookieOptions);
  return response;
}
