import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import type { TripDoc, PackingItemDoc } from "@/lib/household/trip";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, tripId } = await params;
  if (!ObjectId.isValid(tripId)) return NextResponse.json({ error: "Invalid trip id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<TripDoc>("trips").deleteOne({ _id: new ObjectId(tripId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  await db.collection<PackingItemDoc>("packingItems").deleteMany({ householdId, tripId });

  return NextResponse.json({ ok: true });
}
