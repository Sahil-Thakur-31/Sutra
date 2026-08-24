import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toReminderDTO, type ReminderDoc } from "@/lib/household/reminder";
import { startOfDay } from "@/lib/recurrence";
import type { ReminderRecurrence, ReminderKind } from "@/lib/types";

const RECURRENCES: ReminderRecurrence[] = ["once", "weekly", "monthly", "yearly"];
const KINDS: ReminderKind[] = ["bill", "birthday", "appointment", "other"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<ReminderDoc>("reminders")
    .find({ householdId, $or: [{ recurrence: { $ne: "once" } }, { status: "pending" }] })
    .sort({ dueDate: 1 })
    .toArray();

  return NextResponse.json({ reminders: docs.map(toReminderDTO) });
}

interface CreateReminderBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  kind?: ReminderKind;
  recurrence?: ReminderRecurrence;
  dueDate?: number;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateReminderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Reminder title is required." }, { status: 400 });

  const recurrence = body.recurrence ?? "once";
  if (!RECURRENCES.includes(recurrence)) return NextResponse.json({ error: "Invalid recurrence." }, { status: 400 });

  const kind = body.kind ?? "other";
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid reminder kind." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const createdAt = Date.now();
  const dueDate = startOfDay(body.dueDate ?? createdAt);

  const newDoc: ReminderDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    kind,
    recurrence,
    dueDate,
    status: "pending",
    dismissedByUid: null,
    dismissedByName: null,
    dismissedAt: null,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt,
  };

  const insertResult = await db.collection<ReminderDoc>("reminders").insertOne(newDoc);
  const reminder = toReminderDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "reminder-added", reminder });

  return NextResponse.json({ reminder });
}
