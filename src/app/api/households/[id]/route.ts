import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import type { HouseholdDTO } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid household id." }, { status: 400 });

  const db = await getDb();
  const householdDoc = await db.collection("households").findOne({ _id: new ObjectId(id) });
  if (!householdDoc || !householdDoc.memberUids.includes(uid)) {
    return NextResponse.json({ error: "Household not found." }, { status: 404 });
  }

  const household: HouseholdDTO = {
    id: householdDoc._id.toHexString(),
    name: householdDoc.name,
    memberUids: householdDoc.memberUids,
    memberLanguages: householdDoc.memberLanguages,
    inviteCode: householdDoc.inviteCode,
    createdBy: householdDoc.createdBy,
    createdAt: householdDoc.createdAt,
  };

  return NextResponse.json({ household });
}
