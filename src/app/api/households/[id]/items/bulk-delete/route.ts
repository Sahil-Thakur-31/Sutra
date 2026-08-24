import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import type { GroceryItemDoc } from "@/lib/household/groceryItem";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ids = (body.ids ?? []).filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "No valid item ids given." }, { status: 400 });

  const objectIds = ids.map((id) => new ObjectId(id));
  const result = await db
    .collection<GroceryItemDoc>("groceryItems")
    .deleteMany({ _id: { $in: objectIds }, householdId });

  for (const itemId of ids) {
    publish(householdId, { type: "item-removed", itemId });
  }

  return NextResponse.json({ deletedCount: result.deletedCount });
}
