import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import type { HabitDoc, HabitCheckinDoc } from "@/lib/household/habit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; habitId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, habitId } = await params;
  if (!ObjectId.isValid(habitId)) return NextResponse.json({ error: "Invalid habit id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<HabitDoc>("habits").deleteOne({ _id: new ObjectId(habitId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

  await db.collection<HabitCheckinDoc>("habitCheckins").deleteMany({ householdId, habitId });

  publish(householdId, { type: "habit-removed", habitId });

  return NextResponse.json({ ok: true });
}
