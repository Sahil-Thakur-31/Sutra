import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import type { BillDoc } from "@/lib/household/bill";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, billId } = await params;
  if (!ObjectId.isValid(billId)) return NextResponse.json({ error: "Invalid bill id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<BillDoc>("bills").deleteOne({ _id: new ObjectId(billId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  publish(householdId, { type: "bill-removed", billId });

  return NextResponse.json({ ok: true });
}
