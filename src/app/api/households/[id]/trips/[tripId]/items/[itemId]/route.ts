import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toPackingItemDTO, type PackingItemDoc } from "@/lib/household/trip";

type Params = { params: Promise<{ id: string; tripId: string; itemId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, tripId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { packed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.packed !== "boolean") return NextResponse.json({ error: "packed must be a boolean." }, { status: 400 });

  const items = db.collection<PackingItemDoc>("packingItems");
  const updated = await items.findOneAndUpdate(
    { _id: new ObjectId(itemId), householdId, tripId },
    { $set: { packed: body.packed, packedByUid: body.packed ? uid : null } },
    { returnDocument: "after" }
  );
  if (!updated) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  return NextResponse.json({ item: toPackingItemDTO(updated) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, tripId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db
    .collection<PackingItemDoc>("packingItems")
    .deleteOne({ _id: new ObjectId(itemId), householdId, tripId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
