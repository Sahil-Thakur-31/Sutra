import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toHabitDTO, HABIT_HISTORY_DAYS, type HabitDoc, type HabitCheckinDoc } from "@/lib/household/habit";
import { startOfDay } from "@/lib/recurrence";

const ONE_DAY = 24 * 60 * 60 * 1000;

export async function POST(
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

  const habitDoc = await db.collection<HabitDoc>("habits").findOne({ _id: new ObjectId(habitId), householdId });
  if (!habitDoc) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

  const checkins = db.collection<HabitCheckinDoc>("habitCheckins");
  const today = startOfDay(Date.now());
  const existing = await checkins.findOne({ householdId, habitId, date: today });

  if (existing) {
    await checkins.deleteOne({ _id: existing._id });
  } else {
    const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
    await checkins.insertOne({
      householdId,
      habitId,
      date: today,
      checkedByUid: uid,
      checkedByName: userDoc?.name ?? "Someone",
      createdAt: Date.now(),
    });
  }

  const since = startOfDay(Date.now()) - HABIT_HISTORY_DAYS * ONE_DAY;
  const recent = await checkins.find({ householdId, habitId, date: { $gte: since } }).toArray();
  const habit = toHabitDTO(habitDoc, recent.map((c) => c.date));

  publish(householdId, { type: "habit-updated", habit });

  return NextResponse.json({ habit });
}
