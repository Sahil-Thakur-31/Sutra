import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toCalendarEventDTO, type CalendarEventDoc } from "@/lib/household/calendarEvent";

function monthRange(month: string): { start: number; end: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return { start: new Date(year, monthIndex, 1).getTime(), end: new Date(year, monthIndex + 1, 1).getTime() };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const monthParam = request.nextUrl.searchParams.get("month");
  const range = monthParam ? monthRange(monthParam) : null;
  if (!range) return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });

  const docs = await db
    .collection<CalendarEventDoc>("events")
    .find({ householdId, date: { $gte: range.start, $lt: range.end } })
    .sort({ date: 1, time: 1 })
    .toArray();

  return NextResponse.json({ events: docs.map(toCalendarEventDTO) });
}

interface CreateEventBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  date: number;
  time?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateEventBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Event title is required." }, { status: 400 });
  if (!Number.isFinite(body.date)) return NextResponse.json({ error: "A valid date is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const d = new Date(body.date);
  d.setHours(0, 0, 0, 0);

  const newDoc: CalendarEventDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    date: d.getTime(),
    time: body.time?.trim() || null,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<CalendarEventDoc>("events").insertOne(newDoc);
  const event = toCalendarEventDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "event-added", event });

  return NextResponse.json({ event });
}
