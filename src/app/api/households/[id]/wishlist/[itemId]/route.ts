import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toWishlistItemDTO, redactForViewer, type WishlistItemDoc } from "@/lib/household/wishlistItem";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { reserved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.reserved !== "boolean") {
    return NextResponse.json({ error: "reserved must be a boolean." }, { status: 400 });
  }

  const items = db.collection<WishlistItemDoc>("wishlistItems");
  const existing = await items.findOne({ _id: new ObjectId(itemId), householdId });
  if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  // The owner can never reserve (or see reservations on) their own item --
  // that's the entire point of the feature.
  if (existing.ownerUid === uid) {
    return NextResponse.json({ error: "You can't reserve your own wishlist item." }, { status: 403 });
  }

  if (body.reserved && existing.reservedByUid && existing.reservedByUid !== uid) {
    return NextResponse.json({ error: "Someone else already reserved this." }, { status: 409 });
  }

  let userName: string | null = null;
  if (body.reserved) {
    const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
    userName = userDoc?.name ?? "Someone";
  }

  const updated = await items.findOneAndUpdate(
    { _id: existing._id },
    { $set: { reservedByUid: body.reserved ? uid : null, reservedByName: body.reserved ? userName : null } },
    { returnDocument: "after" }
  );
  if (!updated) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const item = toWishlistItemDTO(updated);
  publish(householdId, { type: "wishlist-updated", item });

  return NextResponse.json({ item: redactForViewer(item, uid) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, itemId } = await params;
  if (!ObjectId.isValid(itemId)) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const items = db.collection<WishlistItemDoc>("wishlistItems");
  const existing = await items.findOne({ _id: new ObjectId(itemId), householdId });
  if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  if (existing.ownerUid !== uid) {
    return NextResponse.json({ error: "Only the owner can remove this item." }, { status: 403 });
  }

  await items.deleteOne({ _id: existing._id });
  publish(householdId, { type: "wishlist-removed", itemId });

  return NextResponse.json({ ok: true });
}
