import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ChangeEmailBody {
  currentPassword: string;
  newEmail: string;
}

export async function PATCH(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: ChangeEmailBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.currentPassword) return NextResponse.json({ error: "Current password is required." }, { status: 400 });

  const newEmail = body.newEmail?.trim().toLowerCase();
  if (!newEmail) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!EMAIL_RE.test(newEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const passwordOk = await verifyPassword(body.currentPassword, userDoc.passwordHash);
  if (!passwordOk) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  if (newEmail === userDoc.email) {
    return NextResponse.json({ error: "That's already your email." }, { status: 400 });
  }

  const existing = await users.findOne({ email: newEmail, _id: { $ne: new ObjectId(uid) } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  await users.updateOne({ _id: new ObjectId(uid) }, { $set: { email: newEmail } });

  return NextResponse.json({ email: newEmail });
}
