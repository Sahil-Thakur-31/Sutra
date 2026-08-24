import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { inviteCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const inviteCode = body.inviteCode?.trim().toUpperCase();
  if (!inviteCode) return NextResponse.json({ error: "Invite code is required." }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const households = db.collection("households");

  const userDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (userDoc.householdId) {
    return NextResponse.json({ error: "You already belong to a household." }, { status: 409 });
  }

  const householdDoc = await households.findOne({ inviteCode });
  if (!householdDoc) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
  }

  const householdId = householdDoc._id.toHexString();
  const preferredLanguage = userDoc.preferredLanguage ?? "en";

  await households.updateOne(
    { _id: householdDoc._id },
    {
      $addToSet: { memberUids: uid },
      $set: { [`memberLanguages.${uid}`]: preferredLanguage },
    }
  );
  await users.updateOne({ _id: new ObjectId(uid) }, { $set: { householdId } });

  return NextResponse.json({ householdId });
}
