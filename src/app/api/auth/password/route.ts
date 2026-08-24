import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export async function PATCH(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: ChangePasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.currentPassword) return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  if (!body.newPassword || body.newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");
  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const currentOk = await verifyPassword(body.currentPassword, userDoc.passwordHash);
  if (!currentOk) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const passwordHash = await hashPassword(body.newPassword);
  await users.updateOne({ _id: new ObjectId(uid) }, { $set: { passwordHash } });

  return NextResponse.json({ ok: true });
}
