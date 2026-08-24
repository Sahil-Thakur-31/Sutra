import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";

interface MemberDTO {
  uid: string;
  name: string;
  preferredLanguage: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const memberUids: string[] = household.memberUids;
  const docs = await db
    .collection("users")
    .find({ _id: { $in: memberUids.map((id) => new ObjectId(id)) } })
    .toArray();

  const members: MemberDTO[] = docs.map((doc) => ({
    uid: doc._id.toHexString(),
    name: doc.name,
    preferredLanguage: doc.preferredLanguage,
  }));

  return NextResponse.json({ members });
}
