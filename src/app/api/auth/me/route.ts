import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import type { UserProfileDTO } from "@/lib/types";

const MAX_PHOTO_LENGTH = 500_000; // ~375KB of binary data once decoded

function toProfileDTO(uid: string, userDoc: Record<string, unknown>): UserProfileDTO {
  return {
    uid,
    name: userDoc.name as string,
    email: (userDoc.email as string) ?? null,
    phone: (userDoc.phone as string) ?? null,
    preferredLanguage: userDoc.preferredLanguage as string,
    householdId: (userDoc.householdId as string) ?? null,
    photoUrl: (userDoc.photoUrl as string) ?? null,
    dateOfBirth: (userDoc.dateOfBirth as string) ?? null,
    gender: (userDoc.gender as string) ?? null,
  };
}

export async function GET(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ profile: null }, { status: 200 });

  const db = await getDb();
  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ profile: null }, { status: 200 });

  return NextResponse.json({ profile: toProfileDTO(uid, userDoc) });
}

interface UpdateMeBody {
  name?: string;
  preferredLanguage?: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export async function PATCH(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: UpdateMeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    update.name = name;
  }
  if (body.preferredLanguage !== undefined) {
    if (!body.preferredLanguage) return NextResponse.json({ error: "Preferred language is required." }, { status: 400 });
    update.preferredLanguage = body.preferredLanguage;
  }
  if (body.photoUrl !== undefined) {
    if (body.photoUrl && (!body.photoUrl.startsWith("data:image/") || body.photoUrl.length > MAX_PHOTO_LENGTH)) {
      return NextResponse.json({ error: "Invalid or oversized photo." }, { status: 400 });
    }
    update.photoUrl = body.photoUrl || null;
  }
  if (body.dateOfBirth !== undefined) {
    update.dateOfBirth = body.dateOfBirth?.trim() || null;
  }
  if (body.gender !== undefined) {
    update.gender = body.gender?.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await users.updateOne({ _id: new ObjectId(uid) }, { $set: update });

  // Keep the household's denormalized memberLanguages map in sync so
  // future translations target the member's current language.
  if (update.preferredLanguage && userDoc.householdId) {
    await db
      .collection("households")
      .updateOne({ _id: new ObjectId(userDoc.householdId) }, { $set: { [`memberLanguages.${uid}`]: update.preferredLanguage } });
  }

  const profile = toProfileDTO(uid, { ...userDoc, ...update });

  return NextResponse.json({ profile });
}
