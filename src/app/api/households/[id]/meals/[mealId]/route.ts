import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import type { MealDoc } from "@/lib/household/meal";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, mealId } = await params;
  if (!ObjectId.isValid(mealId)) return NextResponse.json({ error: "Invalid meal id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<MealDoc>("meals").deleteOne({ _id: new ObjectId(mealId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Meal not found." }, { status: 404 });

  publish(householdId, { type: "meal-removed", mealId });

  return NextResponse.json({ ok: true });
}
