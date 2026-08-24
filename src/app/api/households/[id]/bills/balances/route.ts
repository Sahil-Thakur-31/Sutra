import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { computeBalances, type BillDoc } from "@/lib/household/bill";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const memberUids: string[] = household.memberUids;
  const memberDocs = await db
    .collection("users")
    .find({ _id: { $in: memberUids.map((id) => new ObjectId(id)) } })
    .toArray();
  const members = memberDocs.map((d) => ({ uid: d._id.toHexString(), name: d.name }));

  // Balances are computed from every bill ever recorded, not just the
  // currently viewed month -- a debt from July doesn't disappear in August.
  const allBills = await db.collection<BillDoc>("bills").find({ householdId }).toArray();
  const balances = computeBalances(allBills, members);

  return NextResponse.json({ balances });
}
