import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/phone";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import type { UserProfileDTO } from "@/lib/types";

interface SignupBody {
  name: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, password, preferredLanguage } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const rawPhone = body.phone?.trim();
  if (!rawPhone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid phone number, e.g. 9876543210 or +14155552671." },
      { status: 400 }
    );
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!preferredLanguage) {
    return NextResponse.json({ error: "Preferred language is required." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const [existingEmail, existingPhone] = await Promise.all([
    users.findOne({ email }),
    users.findOne({ phone }),
  ]);
  if (existingEmail) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  if (existingPhone) {
    return NextResponse.json({ error: "An account with that phone number already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const createdAt = Date.now();

  let uid: string;
  try {
    const insertResult = await users.insertOne({
      name: name.trim(),
      email,
      phone,
      passwordHash,
      preferredLanguage,
      householdId: null,
      createdAt,
    });
    uid = insertResult.insertedId.toHexString();
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && (err as { code: unknown }).code === 11000) {
      return NextResponse.json({ error: "An account with that email or phone number already exists." }, { status: 409 });
    }
    throw err;
  }
  const profile: UserProfileDTO = {
    uid,
    name: name.trim(),
    email,
    phone,
    preferredLanguage,
    householdId: null,
    photoUrl: null,
    dateOfBirth: null,
    gender: null,
  };

  const response = NextResponse.json({ profile });
  response.cookies.set(SESSION_COOKIE, signSession(uid), sessionCookieOptions);
  return response;
}
