import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/phone";

interface ChangePhoneBody {
  currentPassword: string;
  newPhone: string;
}

export async function PATCH(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: ChangePhoneBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.currentPassword) return NextResponse.json({ error: "Current password is required." }, { status: 400 });

  const rawPhone = body.newPhone?.trim();
  if (!rawPhone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  const newPhone = normalizePhone(rawPhone);
  if (!newPhone) {
    return NextResponse.json(
      { error: "Enter a valid phone number, e.g. 9876543210 or +14155552671." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const users = db.collection("users");
  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const passwordOk = await verifyPassword(body.currentPassword, userDoc.passwordHash);
  if (!passwordOk) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  if (newPhone === userDoc.phone) {
    return NextResponse.json({ error: "That's already your phone number." }, { status: 400 });
  }

  const existing = await users.findOne({ phone: newPhone, _id: { $ne: new ObjectId(uid) } });
  if (existing) return NextResponse.json({ error: "An account with that phone number already exists." }, { status: 409 });

  await users.updateOne({ _id: new ObjectId(uid) }, { $set: { phone: newPhone } });

  return NextResponse.json({ phone: newPhone });
}
