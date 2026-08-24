import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { generateInviteCode } from "@/lib/household/inviteCode";

export async function POST(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Household name is required." }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const households = db.collection("households");

  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (userDoc.householdId) {
    return NextResponse.json({ error: "You already belong to a household." }, { status: 409 });
  }

  let inviteCode = generateInviteCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await households.findOne({ inviteCode });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const createdAt = Date.now();
  const preferredLanguage = userDoc.preferredLanguage ?? "en";

  const insertResult = await households.insertOne({
    name,
    memberUids: [uid],
    memberLanguages: { [uid]: preferredLanguage },
    inviteCode,
    createdBy: uid,
    createdAt,
  });

  await users.updateOne({ _id: new ObjectId(uid) }, { $set: { householdId: insertResult.insertedId.toHexString() } });

  return NextResponse.json({ householdId: insertResult.insertedId.toHexString(), inviteCode });
}
