import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toHabitDTO, HABIT_HISTORY_DAYS, type HabitDoc, type HabitCheckinDoc } from "@/lib/household/habit";
import { startOfDay } from "@/lib/recurrence";

const ONE_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const habitDocs = await db.collection<HabitDoc>("habits").find({ householdId }).sort({ createdAt: -1 }).toArray();

  const since = startOfDay(Date.now()) - HABIT_HISTORY_DAYS * ONE_DAY;
  const checkins = await db
    .collection<HabitCheckinDoc>("habitCheckins")
    .find({ householdId, date: { $gte: since } })
    .toArray();

  const checkinsByHabit = new Map<string, number[]>();
  for (const c of checkins) {
    if (!checkinsByHabit.has(c.habitId)) checkinsByHabit.set(c.habitId, []);
    checkinsByHabit.get(c.habitId)!.push(c.date);
  }

  const habits = habitDocs.map((doc) => toHabitDTO(doc, checkinsByHabit.get(doc._id.toHexString()) ?? []));

  return NextResponse.json({ habits });
}

interface CreateHabitBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateHabitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Habit title is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: HabitDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    ownerUid: uid,
    ownerName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<HabitDoc>("habits").insertOne(newDoc);
  const habit = toHabitDTO({ _id: insertResult.insertedId, ...newDoc }, []);

  publish(householdId, { type: "habit-added", habit });

  return NextResponse.json({ habit });
}
