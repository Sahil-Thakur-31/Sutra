import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toGroceryItemDTO, type GroceryItemDoc } from "@/lib/household/groceryItem";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { purchased?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.purchased !== "boolean") {
    return NextResponse.json({ error: "purchased must be a boolean." }, { status: 400 });
  }

  const items = db.collection<GroceryItemDoc>("groceryItems");
  const result = await items.findOneAndUpdate(
    { _id: new ObjectId(itemId), householdId },
    { $set: { purchasedAt: body.purchased ? Date.now() : null, purchasedByUid: body.purchased ? uid : null } },
    { returnDocument: "after" }
  );
  if (!result) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const item = toGroceryItemDTO(result);

  publish(householdId, { type: "item-updated", item });

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db
    .collection<GroceryItemDoc>("groceryItems")
    .deleteOne({ _id: new ObjectId(itemId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  publish(householdId, { type: "item-removed", itemId });

  return NextResponse.json({ ok: true });
}
